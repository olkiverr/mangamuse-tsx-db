@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

echo Création des fichiers de configuration...

:: Récupération et affichage des adresses IPv4
echo Recherche des adresses IPv4 disponibles...
echo.
ipconfig | findstr /i "IPv4" > temp_ips.txt

:: Comptage et affichage des adresses IP
set /a count=0
for /f "tokens=2 delims=:" %%a in (temp_ips.txt) do (
    set /a count+=1
    set "ip!count!=%%a"
    echo !count!. %%a
)

:: Sélection de l'adresse IP
echo.
set /p choice="Veuillez choisir une adresse IP (entrez le numéro) : "

:: Récupération de l'IP sélectionnée
set /a current=0
for /f "tokens=2 delims=:" %%a in (temp_ips.txt) do (
    set /a current+=1
    if !current!==%choice% (
        set "selected_ip=%%a"
        set "selected_ip=!selected_ip: =!"
    )
)

:: Nettoyage du fichier temporaire
del temp_ips.txt

:: Définition du port
set PORT=3000

:: Création du .gitignore
echo # Dépendances > .gitignore
echo node_modules/ >> .gitignore
echo .env >> .gitignore
echo .env.local >> .gitignore
echo .env.*.local >> .gitignore
echo dist/ >> .gitignore
echo build/ >> .gitignore
echo .DS_Store >> .gitignore
echo *.log >> .gitignore
echo .vscode/ >> .gitignore
echo .idea/ >> .gitignore
echo coverage/ >> .gitignore
echo .next/ >> .gitignore
echo .turbo >> .gitignore
echo *.db >> .gitignore
echo *.db-journal >> .gitignore

:: Création du .env
echo # Configuration de la base de données > .env
echo DATABASE_URL="file:./dev.db" >> .env
echo # Configuration de l'API
echo PORT=%PORT% >> .env
echo VITE_API_URL="http://%selected_ip%:%PORT%/api" >> .env
echo # Configuration du mode de débogage
echo VITE_DEBUG_MODE=false >> .env

echo Fichiers créés avec succès !
echo L'adresse IP sélectionnée est : %selected_ip%
echo Le port utilisé est : %PORT%
echo
echo Voulez-vous redémarrer le serveur ? (O/N)
set /p restart="Votre choix : "
if /i "%restart%"=="O" (
    start cmd /k "npx prisma generate"
    echo # Serveur redémarré !
) else (
    echo # Redémarrage annulé
)
pause