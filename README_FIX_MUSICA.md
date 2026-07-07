# Fix música Riffy - Queue is empty

Reemplaza estos archivos en tu proyecto:

- `commands/music/play.js`
- `commands/music/search.js`
- `commands/playlist/playlist.js`

Qué corrige:

- Cambia `player.play()` por `await player.play()`.
- Evita el error no manejado `Queue is empty (length: 0)`.
- Antes de reproducir valida si la cola realmente tiene canciones.
- Agrega logs útiles:
  - `[ PLAY DEBUG ]`
  - `[ SEARCH DEBUG ]`
  - `[ PLAYLIST DEBUG ]`

Después de reemplazar, reinicia el bot:

```bash
npm start
```

Si vuelve a decir que la cola está en 0, entonces el problema ya no es el comando, sino que Lavalink no está resolviendo pistas válidas desde YouTube/SoundCloud.
