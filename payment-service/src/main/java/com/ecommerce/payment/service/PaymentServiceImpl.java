package com.ecommerce.payment.service;

import com.ecommerce.payment.dto.CreatePaymentIntentRequest;
import com.ecommerce.payment.dto.CreatePaymentIntentResponse;
import com.ecommerce.payment.dto.PaymentStatusResponse;
import com.ecommerce.payment.entity.Payment;
import com.ecommerce.payment.entity.PaymentStatus;
import com.ecommerce.payment.exception.BadRequestException;
import com.ecommerce.payment.exception.ResourceNotFoundException;
import com.ecommerce.payment.repository.PaymentRepository;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.Map;

/**
 * PaymentServiceImpl — full Stripe integration.
 *
 * PaymentIntent lifecycle:
 *   PENDING  → payment intent created, customer has not confirmed
 *   SUCCESS  → webhook: payment_intent.succeeded received and verified
 *   FAILED   → webhook: payment_intent.payment_failed received
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final com.ecommerce.payment.repository.VendorEarningRepository vendorEarningRepository;
    private final RestTemplate restTemplate;
    private final com.ecommerce.payment.kafka.PaymentEventProducer paymentEventProducer;

    @Value("${stripe.secret.key}")
    private String stripeSecretKey;

    @Value("${stripe.webhook.secret}")
    private String webhookSecret;

    @Value("${platform.fee.percentage:10}")
    private double platformFeePercentage;

    @Value("${order.service.url}")
    private String orderServiceUrl;

    @Value("${notification.service.url}")
    private String notificationServiceUrl;

    /** Initialise the Stripe API key once when the bean is created. */
    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeSecretKey;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CREATE PAYMENT INTENT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Creates a Stripe PaymentIntent and persists a PENDING payment record.
     * Stripe amounts are in the smallest currency unit:
     *   INR: amount × 100  (₹599 → 59900 paise)
     */
    @Override
    @Transactional
    public CreatePaymentIntentResponse createPaymentIntent(CreatePaymentIntentRequest request) {
        try {
            // Convert to smallest unit (paise for INR)
            long amountInSmallestUnit = request.getAmount()
                    .multiply(BigDecimal.valueOf(100))
                    .longValue();

            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                    .setAmount(amountInSmallestUnit)
                    .setCurrency(request.getCurrency())
                    .setAutomaticPaymentMethods(
                            PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                    .setEnabled(true)
                                    .build()
                    )
                    .putMetadata("orderId", request.getOrderId().toString())
                    .putMetadata("customerEmail", request.getCustomerEmail())
                    .putMetadata("customerName", request.getCustomerName())
                    .build();

            PaymentIntent paymentIntent = PaymentIntent.create(params);

            // Persist a pending payment record
            Payment payment = Payment.builder()
                    .orderId(request.getOrderId())
                    .stripePaymentIntentId(paymentIntent.getId())
                    .amount(request.getAmount())
                    .currency(request.getCurrency())
                    .status(PaymentStatus.PENDING)
                    .customerEmail(request.getCustomerEmail())
                    .customerName(request.getCustomerName())
                    .build();

            paymentRepository.save(payment);

            log.info("Stripe PaymentIntent {} created for orderId={}, amount={}",
                    paymentIntent.getId(), request.getOrderId(), request.getAmount());

            return CreatePaymentIntentResponse.builder()
                    .paymentIntentId(paymentIntent.getId())
                    .clientSecret(paymentIntent.getClientSecret())
                    .amount(request.getAmount())
                    .currency(request.getCurrency())
                    .build();

        } catch (Exception e) {
            log.error("Failed to create Stripe PaymentIntent for orderId={}: {}",
                    request.getOrderId(), e.getMessage());
            throw new BadRequestException("Payment initialisation failed: " + e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WEBHOOK HANDLER
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Verifies the Stripe webhook signature and dispatches to the appropriate handler.
     * Called by Stripe after a payment event occurs.
     */
    @Override
    @Transactional
    public void handleWebhook(String payload, String sigHeader) {
        Event event;

        try {
            if (webhookSecret != null && !webhookSecret.contains("your_stripe_webhook_secret")) {
                event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
            } else {
                log.info("Webhook secret is default/placeholder. Creating Event via EventDataDeserializer.");
                event = com.stripe.model.Event.GSON.fromJson(payload, com.stripe.model.Event.class);
            }
        } catch (SignatureVerificationException e) {
            log.warn("Stripe webhook signature verification failed: {}", e.getMessage());
            throw new BadRequestException("Invalid webhook signature");
        } catch (Exception e) {
            log.warn("Failed to parse Stripe webhook event: {}", e.getMessage());
            throw new BadRequestException("Invalid webhook payload");
        }

        log.info("Stripe webhook received: type={}, id={}", event.getType(), event.getId());

        switch (event.getType()) {
            case "payment_intent.succeeded" -> handlePaymentSucceeded(event);
            case "payment_intent.payment_failed" -> handlePaymentFailed(event);
            default -> log.debug("Unhandled Stripe webhook event type: {}", event.getType());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PAYMENT STATUS
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public PaymentStatusResponse getPaymentStatus(Long orderId) {
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No payment record found for orderId: " + orderId));

        return PaymentStatusResponse.builder()
                .orderId(payment.getOrderId())
                .stripePaymentIntentId(payment.getStripePaymentIntentId())
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .status(payment.getStatus().name())
                .failureReason(payment.getFailureReason())
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private void handlePaymentSucceeded(Event event) {
        PaymentIntent pi = (PaymentIntent) event.getDataObjectDeserializer()
                .getObject()
                .orElseThrow(() -> new BadRequestException("Could not deserialize PaymentIntent"));

        paymentRepository.findByStripePaymentIntentId(pi.getId()).ifPresentOrElse(payment -> {
            payment.setStatus(PaymentStatus.SUCCESS);
            paymentRepository.save(payment);
            log.info("Payment {} marked SUCCESS for orderId={}", pi.getId(), payment.getOrderId());

            // Record vendor earnings (90% vendor share, 10% platform fee)
            recordVendorEarnings(payment);

            // Update order status to PROCESSING
            updateOrderStatus(payment.getOrderId(), "PROCESSING");

            // Send payment success notification via Kafka event
            paymentEventProducer.publishPaymentCompleted(payment, "SUCCESS", null);

        }, () -> log.warn("Received payment_intent.succeeded for unknown paymentIntentId: {}", pi.getId()));
    }

    @Override
    public void recordVendorEarningsForOrder(Long orderId) {
        try {
            if (vendorEarningRepository.existsByOrderId(orderId)) {
                log.info("Vendor earnings already recorded for orderId={}", orderId);
                return;
            }

            String url = orderServiceUrl + "/api/internal/orders/" + orderId + "/vendor-breakdown";
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            if (response.getBody() != null && !response.getBody().isEmpty()) {
                Map<Object, Object> breakdown = response.getBody();

                java.time.LocalDate now = java.time.LocalDate.now();
                int year = now.get(java.time.temporal.IsoFields.WEEK_BASED_YEAR);
                int weekNum = now.get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR);
                String payoutWeek = String.format("%d-W%02d", year, weekNum);

                for (Map.Entry<Object, Object> entry : breakdown.entrySet()) {
                    Long vendorId = Long.valueOf(entry.getKey().toString());
                    BigDecimal vendorTotal = new BigDecimal(entry.getValue().toString());

                    BigDecimal feePct = BigDecimal.valueOf(platformFeePercentage).divide(BigDecimal.valueOf(100));
                    BigDecimal platformFee = vendorTotal.multiply(feePct).setScale(2, java.math.RoundingMode.HALF_UP);
                    BigDecimal vendorEarningAmount = vendorTotal.subtract(platformFee);

                    com.ecommerce.payment.entity.VendorEarning earning = com.ecommerce.payment.entity.VendorEarning.builder()
                            .vendorId(vendorId)
                            .orderId(orderId)
                            .paymentIntentId("ORD-" + orderId)
                            .totalAmount(vendorTotal)
                            .platformFee(platformFee)
                            .vendorEarning(vendorEarningAmount)
                            .payoutWeek(payoutWeek)
                            .payoutStatus(com.ecommerce.payment.entity.VendorEarning.PayoutStatus.PENDING)
                            .build();

                    vendorEarningRepository.save(earning);
                    log.info("VendorEarning saved: vendorId={}, orderId={}, earning={}, fee={}",
                            vendorId, orderId, vendorEarningAmount, platformFee);
                }
            }
        } catch (Exception e) {
            log.error("Failed to calculate and record vendor earnings for orderId={}: {}", orderId, e.getMessage());
        }
    }

    private void recordVendorEarnings(Payment payment) {
        if (payment != null && payment.getOrderId() != null) {
            recordVendorEarningsForOrder(payment.getOrderId());
        }
    }

    private void handlePaymentFailed(Event event) {
        PaymentIntent pi = (PaymentIntent) event.getDataObjectDeserializer()
                .getObject()
                .orElseThrow(() -> new BadRequestException("Could not deserialize PaymentIntent"));

        String failureReason = pi.getLastPaymentError() != null
                ? pi.getLastPaymentError().getMessage()
                : "Unknown failure reason";

        paymentRepository.findByStripePaymentIntentId(pi.getId()).ifPresentOrElse(payment -> {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason(failureReason);
            paymentRepository.save(payment);
            log.warn("Payment {} FAILED for orderId={}: {}", pi.getId(), payment.getOrderId(), failureReason);

            // Send payment failure notification via Kafka event
            paymentEventProducer.publishPaymentCompleted(payment, "FAILED", failureReason);

        }, () -> log.warn("Received payment_intent.payment_failed for unknown paymentIntentId: {}", pi.getId()));
    }

    /**
     * Calls order-service internal API to update the order's status.
     */
    private void updateOrderStatus(Long orderId, String status) {
        try {
            String url = orderServiceUrl + "/api/internal/orders/" + orderId + "/status";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> entity = new HttpEntity<>(Map.of("status", status), headers);
            restTemplate.put(url, entity);
            log.info("Order {} status updated to {}", orderId, status);
        } catch (Exception e) {
            log.error("Failed to update order {} status to {}: {}", orderId, status, e.getMessage());
        }
    }

    /**
     * Calls notification-service to send a payment result email.
     */
    private void sendPaymentNotification(Payment payment, String paymentStatus, String failureReason) {
        try {
            String url = notificationServiceUrl + "/api/internal/notifications/payment";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> body = Map.of(
                    "customerEmail", payment.getCustomerEmail(),
                    "customerName", payment.getCustomerName(),
                    "orderId", payment.getOrderId(),
                    "amount", payment.getAmount(),
                    "paymentStatus", paymentStatus,
                    "paymentId", payment.getStripePaymentIntentId(),
                    "failureReason", failureReason != null ? failureReason : ""
            );

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            restTemplate.postForEntity(url, entity, Map.class);
            log.info("Payment {} notification sent for orderId={}", paymentStatus, payment.getOrderId());
        } catch (Exception e) {
            log.error("Failed to send payment notification for orderId={}: {}", payment.getOrderId(), e.getMessage());
        }
    }
}
