# 🎁 Amigo Invisible

Web estática (HTML + CSS + JS, sin dependencias) para organizar un sorteo de amigo invisible:

- Lista de participantes con nombre y correo (de a uno o pegando una lista).
- Sorteo al azar, con **opciones avanzadas discretas**: fijar que a alguien le toque una persona concreta o excluir combinaciones. Esas reglas viven solo en el navegador del organizador; los correos y enlaces no muestran nada, así que el resultado parece 100% aleatorio.
- Mensaje personalizado con emojis (`{nombre}` se reemplaza por el nombre de cada uno).
- Correo con un botón que lleva a `ver.html`, donde cada persona abre un regalo y descubre a quién le toca.
- Modo prueba: todos los correos llegan a tu casilla.
- Enlaces copiables / `mailto` por si preferís mandarlos a mano (WhatsApp, etc.).

## Publicar en GitHub Pages

1. **Settings → Pages**.
2. En *Build and deployment* elegí **Deploy from a branch**, la rama del proyecto y la carpeta `/ (root)`.
3. Guardá. En un minuto queda en `https://nchiari.github.io/Amigo-Invisible/`.

## Configurar EmailJS

GitHub Pages no tiene servidor, así que los correos salen por [EmailJS](https://www.emailjs.com/) (plan gratis: 200 correos/mes).

1. Creá una cuenta en emailjs.com.
2. **Email Services → Add New Service → Gmail** y conectá tu cuenta. Anotá el **Service ID**.
3. **Email Templates → Create New Template** y configurá:
   - **Subject:** `{{subject}}`
   - **To Email:** `{{to_email}}`
   - **From Name:** `{{from_name}}`
   - **Content:** pasá el editor a modo código (`<>`) y pegá solo esto (con **tres** llaves, así no escapa el HTML):
     ```
     {{{html_body}}}
     ```
   Guardá y anotá el **Template ID**.
4. **Account → General**: copiá la **Public Key**.
5. En la web, abrí *✉️ Configurar el envío de correos* y pegá las tres claves. Se guardan en tu navegador.

## Cómo funciona el secreto

Cada enlace lleva el nombre de quien regala y de quien recibe, ofuscado (no legible a simple vista). No hay base de datos ni servidor: nadie, ni el organizador, ve el resultado completo salvo que inspeccione los enlaces. Las reglas avanzadas nunca salen del navegador del organizador.

> Es ofuscación, no cifrado fuerte: alcanza para un juego entre amigos, no para secretos de Estado.

## Desarrollo local

```bash
python3 -m http.server
# abrir http://localhost:8000
```
