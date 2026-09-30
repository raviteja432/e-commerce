# Script to start all microservices in the background, redirecting output to log files.
$root = "C:\e-commerce"
$logsDir = "$root\logs"

if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

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

Write-Host "Stopping any services already running on these ports..." -ForegroundColor Yellow
foreach ($svc in $services) {
    $port = $svc.port
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conn) {
        $pids = $conn.OwningProcess | Select-Object -Unique
        foreach ($procId in $pids) {
            Write-Host "  Killing process $procId using port $port" -ForegroundColor Red
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host "Starting E-Commerce Microservices in the background..." -ForegroundColor Green

foreach ($svc in $services) {
    $name = $svc.name
    $dir  = "$root\$name"
    $logFile = "$logsDir\$name.log"
    
    Write-Host "  Starting $name (port $($svc.port)) -> log: $logFile" -ForegroundColor Cyan
    
    # Run maven command using cmd.exe in background, redirecting output
    Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c mvn spring-boot:run" `
        -WorkingDirectory $dir `
        -RedirectStandardOutput $logFile `
        -RedirectStandardError "$logsDir\$name-error.log" `
        -NoNewWindow
        
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "All services started in the background!" -ForegroundColor Green
Write-Host "Check progress in C:\e-commerce\logs\" -ForegroundColor Cyan
Write-Host "Access the frontend interface at http://localhost:8080" -ForegroundColor Yellow
