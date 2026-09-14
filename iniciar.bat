@echo off
setlocal
title Tarot - servidor local

rem Roda sempre a partir da pasta do .bat, mesmo com duplo clique de outro lugar.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo  Node.js nao encontrado.
    echo  Instale em https://nodejs.org e rode este arquivo de novo.
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo.
    echo  Primeira execucao: instalando as dependencias.
    echo  Isso leva um ou dois minutos.
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo  Falha ao instalar as dependencias.
        echo.
        pause
        exit /b 1
    )
)

echo.
echo  Iniciando o site... o navegador abre sozinho quando ficar pronto.
echo  Para parar, feche esta janela ou aperte Ctrl+C.
echo.

rem --open faz o Vite abrir o navegador so depois que o servidor sobe,
rem e ja aponta para a porta certa caso a 5173 esteja ocupada.
call npm run dev -- --open

echo.
echo  O servidor foi encerrado.
pause
