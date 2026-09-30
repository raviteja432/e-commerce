# Script to run all e-commerce microservices and persist the parent process to keep them alive.
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

Write-Host "Stopping any services already running on ports 8080-8087..." -ForegroundColor Yellow
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

Write-Host "Starting all 8 services in the background..." -ForegroundColor Green

$runningProcesses = @()

foreach ($svc in $services) {
    $name = $svc.name
    $dir  = "$root\$name"
    $logFile = "$logsDir\$name.log"
    $errFile = "$logsDir\$name-error.log"
    
    Write-Host "  Starting $name (port $($svc.port))..." -ForegroundColor Cyan
    
    $p = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c mvn spring-boot:run" `
        -WorkingDirectory $dir `
        -RedirectStandardOutput $logFile `
        -RedirectStandardError $errFile `
        -NoNewWindow `
        -PassThru
        
    $runningProcesses += $p
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "All services are launching in the background! Logs are located in: $logsDir" -ForegroundColor Green
Write-Host "Access the frontend interface at http://localhost:8080" -ForegroundColor Yellow
Write-Host "Keeping this process alive. To stop the services, terminate this task." -ForegroundColor Cyan

# Keep process alive
try {
    while ($true) {
        # Optional: check if child processes are still running, and print warnings if they exit unexpectedly
        for ($i = 0; $i -lt $services.Length; $i++) {
            $proc = $runningProcesses[$i]
            $svcName = $services[$i].name
            if ($proc.HasExited) {
                # Verify by checking if the port is listening (since mvn spawns java, cmd might exit but java remains)
                $port = $services[$i].port
                $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
                if (-not $conn) {
                    Write-Host "[WARNING] Service '$svcName' (port $port) seems to have exited! Check log at $logsDir\$svcName.log" -ForegroundColor Red
                }
            }
        }
        Start-Sleep -Seconds 15
    }
}
finally {
    Write-Host "Stopping all background services..." -ForegroundColor Yellow
    foreach ($proc in $runningProcesses) {
        if (-not $proc.HasExited) {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
    }
}
