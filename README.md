# VibeLeague

Plataforma social competitiva: respondes sobre ti y tus amigos intentan acertar.

```bash
npm install
npm run dev
```

Abre http://localhost:3000. Sin claves de Supabase la partida se guarda en el dispositivo. Para auth real (correo, Google) copia `.env.example` a `.env.local` y pega la URL y la publishable key del proyecto.

En el SQL Editor de Supabase, ejecuta `supabase/schema.sql` y después `supabase/pulse.sql`. En Authentication, activa Email y Google. En la plantilla de confirmación, usa `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.

Apple queda preparado en la pantalla de acceso para cuando actives el proveedor.
