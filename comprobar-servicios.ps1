param([ValidateRange(0,600)][int]$EsperarSegundos=0)
$ErrorActionPreference='Stop'
$limite=[DateTime]::UtcNow.AddSeconds($EsperarSegundos)
function Test-OraclePort {
  $cliente=New-Object System.Net.Sockets.TcpClient
  try {
    $tarea=$cliente.ConnectAsync('localhost',1522)
    if(-not $tarea.Wait(1200)){return $false}
    return $cliente.Connected
  } catch {return $false} finally {$cliente.Dispose()}
}
function Test-KeycloakRealm {
  try {
    $config=Invoke-RestMethod -Uri 'http://localhost:8180/realms/maiz-erp/.well-known/openid-configuration' -TimeoutSec 3
    if($config.issuer -ne 'http://localhost:8180/realms/maiz-erp'){return $false}
    $certs=Invoke-RestMethod -Uri $config.jwks_uri -TimeoutSec 3
    return @($certs.keys).Count -gt 0
  } catch {return $false}
}
do {
  $oracle=Test-OraclePort
  $keycloak=Test-KeycloakRealm
  Write-Host ('Oracle TCP 1522: {0} | Keycloak realm/certificados 8180: {1}' -f $oracle,$keycloak)
  if($oracle -and $keycloak){
    Write-Host 'Servicios disponibles. Falta verificar conexion JDBC y login real con el backend en ejecucion.'
    exit 0
  }
  if([DateTime]::UtcNow -ge $limite){break}
  Start-Sleep -Seconds 3
} while($true)
Write-Host 'Los servicios aun no estan disponibles. No cierres el diagnostico dando por valida la integracion.'
exit 1
