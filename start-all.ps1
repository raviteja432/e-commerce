# Script to start all microservices, each in its own visible CMD window
# Uses system-installed Maven (mvn) instead of mvnw.cmd

$root = "C:\e-commerce"
$services = @(
    @{ name = "gateway";              port = 8080 },
    @{ name = "auth-service";         port = 8081 },
    @{ name = "vendor-service";       port = 8082 },
    @{ name = "product-service";      port = 8083 },
    @{ name = "cart-service";         port = 8084 },
    @{ name = "order-service";        port = 8085 },
    @{ name = "payment-service";      port = 8086 },
    @{ name = "notification-service"; port = 8087 }
)

Write-Host "Starting E-Commerce Microservices..." -ForegroundColor Green

foreach ($svc in $services) {
    $name = $svc.name
    $dir  = "$root\$name"
    Write-Host "  Starting $name (port $($svc.port))..." -ForegroundColor Cyan
    Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/k title $name && cd /d `"$dir`" && mvn spring-boot:run" `
        -WindowStyle Normal
    Start-Sleep -Milliseconds 800
}

Write-Host ""
Write-Host "All services are launching! Each CMD window title shows the service name." -ForegroundColor Green
Write-Host "Watch for: 'Started ...Application in X.X seconds' in each window." -ForegroundColor Cyan
Write-Host "Access the frontend interface at http://localhost:8080" -ForegroundColor Yellow
