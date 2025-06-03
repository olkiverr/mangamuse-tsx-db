@echo off
echo # Démarrage du serveur...
start cmd /k "npm run server"
echo # Démarrage du client...
start cmd /k "npx vite --host"
echo # Serveurs démarrés !
pause