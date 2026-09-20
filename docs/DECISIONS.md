# Decisiones Arquitectónicas y Técnicas

## Bloqueo de Google Stitch MCP
Se reporta un bloqueo al intentar conectar con el servidor MCP de Google Stitch. Las herramientas de este servidor no están disponibles en el entorno actual. De acuerdo con el protocolo, se omite la generación de UI con Stitch y se continúa con el Paso B (andamiaje fase 1).

## Renombramiento a "chanchito"
Se renombra el proyecto completo a "chanchito" incluyendo BD de Docker, PWA manifest, package.json y usuarios por petición explícita.

## Docker no disponible
El comando `docker compose up -d db` falló porque el demonio de Docker no está en ejecución en la máquina. El archivo docker-compose.yml se generó correctamente, pero el contenedor no se pudo iniciar.
