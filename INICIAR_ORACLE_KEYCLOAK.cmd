@echo off
setlocal
cd /d "%~dp0"
echo Comprobando Docker Desktop...
docker info >nul 2>&1
if errorlevel 1 (
  echo.
  echo Abre Docker Desktop y espera a que el motor este en ejecucion.
  echo Despues vuelve a ejecutar este archivo.
  pause
  exit /b 1
)
echo Iniciando Oracle y Keycloak del proyecto...
docker compose up -d oracle keycloak
if errorlevel 1 (
  echo No se pudieron iniciar los contenedores. Revisa el error anterior.
  pause
  exit /b 1
)
powershell.exe -NoProfile -File "%~dp0comprobar-servicios.ps1" -EsperarSegundos 180
if errorlevel 1 (
  echo.
  echo Para ver el detalle ejecuta: docker compose logs --tail 80 oracle keycloak
  pause
  exit /b 1
)
echo.
echo Oracle y Keycloak responden. Ahora inicia el backend y el frontend.
echo Las instrucciones estan en README.md.
pause
