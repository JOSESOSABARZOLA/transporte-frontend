---
name: flujo-git-amc
description: Flujo de Git del equipo AMC — crear ramas desde el main real del equipo y hacer commits con la convención institucional. Úsala cuando haya que empezar una rama nueva, sincronizar con origin/main o preparar un commit. Ejemplos que la disparan: "crea la rama david_agosto_v1", "nueva rama desde main", "prepara el commit".
---

# Flujo de Git — AMC

## 1. Crear una rama desde el `main` real

Siempre se parte de `origin/main`, no del `main` local, que puede estar desactualizado o con
historia desconectada.

```bash
git -C <repo> fetch origin
git -C <repo> checkout -b <nombre-rama> origin/main
```

**Datos que necesito antes de ejecutar:**

- Nombre de la rama. Si no se dio, pregúntalo.
- Repositorio: `transporte-backend` o `transporte-frontend`. Si no es obvio por el directorio
  actual, pregunta.

**Si el repositorio local tiene historia desconectada** —clonado desde un `.zip` en lugar de
`git clone`— hay que reconectar el remoto antes. Verifica primero con `git -C <repo> remote -v`.

**Conserva los cambios sin commitear.** Si hay trabajo en curso, avisa antes de cambiar de rama
y ofrece `git stash`.

> En algunas máquinas del equipo `git` no está en el PATH. Si falla, búscalo con
> `Get-ChildItem "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe"` y usa la ruta completa.
> Opera siempre con `git -C <ruta-del-repo> ...`.

## 2. Commits

Cortos, precisos, en español, estilo convencional. Una línea, imperativo, sin relleno.

```
feat: agrega politica de descanso de personal
fix: corrige calculo de solapamiento con cruce de medianoche
docs: documenta parametros de politica
chore: actualiza dependencias de prisma
refactor: extrae generador de identificador a servicio propio
```

**NUNCA atribuir a Claude ni a ninguna IA.** Sin `Co-authored-by`, sin «Generated with», sin
mencionarla como autor. El autor es la persona del repositorio.

**No** usar `--no-verify` ni saltarse hooks.

## 3. Antes de `git add`

1. `git status` para revisar qué se va a incluir.
2. Preferir archivos puntuales; evitar `git add .`.
3. Verificar que no entren `.claude/`, `.env`, `dist/`, `node_modules/` ni temporales.
4. Confirmar que compila y pasa el lint.
