# Guía de Colaboración - Entrega 3

**Repositorio:** https://github.com/MatiasMcintire/DDWGordont
**Equipo:** Leonardo Aguilera, Alfredo Sanjuan, Matías Morales, Matías McIntire

---

## 🚀 Setup Inicial (Para cada integrante)

### 1. Clonar el Repositorio

```bash
# Clonar
git clone https://github.com/MatiasMcintire/DDWGordont.git
cd DDWGordont

# Verificar que estás en la rama correcta
git branch
```

### 2. Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env con tus valores locales
# IMPORTANTE: Usar los mismos valores que el equipo para evitar conflictos
```

**Contenido sugerido para `.env`:**
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://mongodb:27017/gordont
REDIS_URL=redis://redis:6379
REDIS_ENABLED=true
JWT_SECRET=tu-secret-super-seguro-minimo-64-caracteres-cambiar-esto-por-uno-random
REFRESH_TOKEN_SECRET=otro-secret-diferente-tambien-de-64-caracteres-cambiar-esto
CORS_ORIGIN=*
SWAGGER_ENABLED=true
```

### 3. Levantar el Proyecto

```bash
# Opción 1: Con Docker (RECOMENDADO para todos usar lo mismo)
docker compose up --build

# Opción 2: Local (solo si no tienes Docker)
npm install
npm start
```

### 4. Verificar que Funciona

```bash
# En otra terminal, verificar health
curl http://localhost:3000/health

# Debería responder:
# {"status":"healthy","timestamp":"...","services":{"mongodb":"connected","redis":"connected"}}
```

---

## 🌿 Estrategia de Branches

### Estructura de Ramas

```
main (producción - NO TOCAR directamente)
  └── develop (desarrollo principal - base para features)
      ├── feature/leonardo-auth-roles
      ├── feature/alfredo-role-middleware
      ├── feature/matias-m-redis-validation
      └── feature/matias-mc-documentation
```

### Reglas de Branches

1. **`main`** - Solo para versión final lista para entrega
   - ❌ NO hacer commits directos
   - ✅ Solo merge desde `develop` cuando TODO esté listo

2. **`develop`** - Rama de desarrollo principal
   - ❌ NO hacer commits directos de features
   - ✅ Solo merge desde ramas `feature/*`
   - ✅ Aquí se integra el trabajo de todos

3. **`feature/*`** - Ramas de trabajo individual
   - ✅ Cada integrante trabaja en su propia rama
   - ✅ Commits frecuentes y descriptivos
   - ✅ Pull Request a `develop` cuando termines

---

## 👥 Trabajo por Integrante

### 🧑‍💻 Leonardo Aguilera - Autenticación y Roles

**Rama:** `feature/leonardo-auth-roles`

**Tareas:**
1. ✅ (YA HECHO) Agregar campo `role` a User schema
2. ✅ (YA HECHO) Incluir `role` en JWT (AuthController)
3. ✅ (YA HECHO) Actualizar authMiddleware para extraer role

**Archivos modificados:**
- `src/infrastructure/persistence/schemas/userSchema.js`
- `src/presentation/controllers/AuthController.js`
- `src/presentation/middleware/authMiddleware.js`
- `src/infrastructure/repositories/MongoUserRepository.js`

**Setup:**
```bash
# Ir a develop
git checkout develop
git pull origin develop

# Crear tu rama (si no existe)
git checkout -b feature/leonardo-auth-roles

# Trabajar en tus archivos...
# Los cambios ya están hechos, solo necesitas commitearlos

# Agregar cambios
git add src/infrastructure/persistence/schemas/userSchema.js
git add src/presentation/controllers/AuthController.js
git add src/presentation/middleware/authMiddleware.js
git add src/infrastructure/repositories/MongoUserRepository.js

# Commit
git commit -m "feat: add role system to User model and JWT authentication

- Add role field to User schema (usuario/admin)
- Include role in JWT payload for register and login
- Extract role from token in authMiddleware
- Add role to User repository mapToDomain"

# Push
git push origin feature/leonardo-auth-roles
```

**Pruebas antes de PR:**
```bash
# Registrar usuario
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"leonardo@test.com","name":"Leonardo","password":"Test123!","weight":75,"height":180,"age":25}'

# Verificar que response incluya "role": "usuario"
```

---

### 🧑‍💻 Alfredo Sanjuan - Middleware de Roles y Admin

**Rama:** `feature/alfredo-role-middleware`

**Tareas:**
1. ✅ (YA HECHO) Crear middleware `requireRole`
2. ✅ (YA HECHO) Crear AdminController
3. ✅ (YA HECHO) Crear rutas admin
4. ✅ (YA HECHO) Integrar rutas en app.simple.js

**Archivos creados/modificados:**
- `src/presentation/middleware/roleMiddleware.js` (NUEVO)
- `src/presentation/controllers/AdminController.js` (NUEVO)
- `src/presentation/routes/admin.routes.js` (NUEVO)
- `src/app.simple.js` (modificado)

**Setup:**
```bash
# Esperar a que Leonardo haga su PR primero
# Luego actualizar develop
git checkout develop
git pull origin develop

# Crear tu rama
git checkout -b feature/alfredo-role-middleware

# Agregar nuevos archivos
git add src/presentation/middleware/roleMiddleware.js
git add src/presentation/controllers/AdminController.js
git add src/presentation/routes/admin.routes.js
git add src/app.simple.js

# Commit
git commit -m "feat: implement role-based access control middleware and admin endpoints

- Add requireRole middleware for role verification
- Create AdminController with 4 endpoints (list/get/delete users, stats)
- Add admin routes with requireAdmin protection
- Integrate admin routes in app.simple.js"

# Push
git push origin feature/alfredo-role-middleware
```

**Pruebas antes de PR:**
```bash
# Crear admin
docker exec gordont-api node src/scripts/seedAdmin.js

# Login como admin
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gordont.com","password":"Admin123!"}'

# Probar endpoint admin
curl -X GET http://localhost:3000/api/v1/admin/users \
  -H "Authorization: Bearer <admin_token>"

# Verificar que usuario normal NO puede acceder (debe dar 403)
curl -X GET http://localhost:3000/api/v1/admin/users \
  -H "Authorization: Bearer <usuario_token>"
```

---

### 🧑‍💻 Matías Morales - Redis Validation

**Rama:** `feature/matias-m-redis-validation`

**Tareas:**
1. ✅ (YA HECHO) Verificar que Redis funciona
2. 📝 Documentar comportamiento de caché
3. 📝 Crear pruebas de caché HIT/MISS

**Archivos a crear/modificar:**
- `docs/REDIS-CACHE.md` (NUEVO - documentación técnica)
- `README.md` (agregar sección de caché si falta)

**Setup:**
```bash
git checkout develop
git pull origin develop

git checkout -b feature/matias-m-redis-validation

# Redis ya está implementado, solo documenta y prueba
```

**Crear documentación:**
```bash
# Crear archivo docs/REDIS-CACHE.md con:
# - Configuración de Redis
# - Endpoints que usan caché
# - Métricas de rendimiento
# - Ejemplos de HIT/MISS
```

**Pruebas:**
```bash
# Test 1: Cache MISS
curl -i -X GET http://localhost:3000/api/v1/entries \
  -H "Authorization: Bearer <token>" | grep X-Cache
# Esperado: X-Cache: MISS

# Test 2: Cache HIT
curl -i -X GET http://localhost:3000/api/v1/entries \
  -H "Authorization: Bearer <token>" | grep X-Cache
# Esperado: X-Cache: HIT

# Test 3: Conectar a Redis
docker exec -it gordont-redis redis-cli
> KEYS *
> TTL entries:*
```

---

### 🧑‍💻 Matías McIntire - Documentación y Docker

**Rama:** `feature/matias-mc-documentation`

**Tareas:**
1. ✅ (YA HECHO) Crear script seedAdmin.js
2. ✅ (YA HECHO) Actualizar README.md
3. ✅ (YA HECHO) Crear docs/API.md
4. ✅ (YA HECHO) Crear documentos de plan y reparto

**Archivos creados/modificados:**
- `src/scripts/seedAdmin.js` (NUEVO)
- `README.md` (actualizado)
- `docs/API.md` (NUEVO)
- `PLAN-ENTREGA-3.md` (NUEVO)
- `REPARTO-TAREAS.md` (NUEVO)
- `RESUMEN-IMPLEMENTACION.md` (NUEVO)

**Setup:**
```bash
git checkout develop
git pull origin develop

git checkout -b feature/matias-mc-documentation

# Agregar archivos
git add src/scripts/
git add README.md
git add docs/API.md
git add PLAN-ENTREGA-3.md
git add REPARTO-TAREAS.md
git add RESUMEN-IMPLEMENTACION.md
git add REQUERIMIENTOS.md

# Commit
git commit -m "docs: add comprehensive documentation for Entrega 3

- Add seedAdmin.js script to create initial admin user
- Update README.md with roles, endpoints table, and examples
- Create complete API.md documentation
- Add PLAN-ENTREGA-3.md with implementation plan
- Add REPARTO-TAREAS.md with task distribution
- Add RESUMEN-IMPLEMENTACION.md with executive summary"

# Push
git push origin feature/matias-mc-documentation
```

**Pruebas:**
```bash
# Verificar Docker
docker compose down -v
docker compose up --build

# Verificar seed script
docker exec gordont-api node src/scripts/seedAdmin.js

# Verificar documentación
# - Leer README.md
# - Leer docs/API.md
# - Verificar que todo esté claro
```

---

## 🔄 Flujo de Trabajo (Workflow)

### Paso 1: Crear Branch Personal

```bash
# Asegurarte de estar en develop
git checkout develop
git pull origin develop

# Crear tu branch
git checkout -b feature/tu-nombre-tarea
```

### Paso 2: Trabajar en tu Branch

```bash
# Hacer cambios en los archivos...

# Ver qué cambiaste
git status
git diff

# Agregar archivos modificados
git add archivo1.js archivo2.js

# O agregar todo
git add .

# Commit con mensaje descriptivo
git commit -m "feat: descripción clara de lo que hiciste"
```

### Paso 3: Push a GitHub

```bash
# Primera vez
git push -u origin feature/tu-nombre-tarea

# Siguientes veces
git push
```

### Paso 4: Crear Pull Request

1. Ir a https://github.com/MatiasMcintire/DDWGordont
2. Verás un botón "Compare & pull request"
3. **Base:** `develop` ← **Compare:** `feature/tu-nombre-tarea`
4. Título: Descripción corta de tu feature
5. Descripción:
   ```markdown
   ## Cambios realizados
   - Lista de cambios

   ## Pruebas realizadas
   - Descripción de cómo probaste

   ## Checklist
   - [x] Código funciona localmente
   - [x] No hay errores de lint
   - [x] Probé con docker compose up
   ```
6. Asignar a otro integrante para revisión
7. Click en "Create Pull Request"

### Paso 5: Code Review

- Otro integrante revisa tu código
- Si hay comentarios, haces los cambios en tu branch y push
- Cuando esté aprobado, hacer **Merge**

### Paso 6: Actualizar tu Branch Local

```bash
# Después de que tu PR fue merged
git checkout develop
git pull origin develop

# Si tienes otra tarea, crear nuevo branch desde develop actualizado
git checkout -b feature/nueva-tarea
```

---

## 📝 Convenciones de Commits

Usar formato: `tipo: descripción`

**Tipos:**
- `feat:` - Nueva funcionalidad
- `fix:` - Corrección de bug
- `docs:` - Solo documentación
- `refactor:` - Refactorización de código
- `test:` - Agregar o modificar tests
- `chore:` - Tareas de mantenimiento

**Ejemplos:**
```bash
git commit -m "feat: add role field to User schema"
git commit -m "fix: correct JWT payload to include role"
git commit -m "docs: update README with role permissions table"
git commit -m "refactor: improve AdminController error handling"
```

---

## 🚨 Resolución de Conflictos

Si tienes conflictos al hacer pull:

```bash
# 1. Guardar tu trabajo actual
git stash

# 2. Traer cambios de develop
git pull origin develop

# 3. Recuperar tu trabajo
git stash pop

# 4. Si hay conflictos, Git marcará los archivos
# Abrirlos y resolver manualmente:
# <<<<<<< HEAD
# tu código
# =======
# código de develop
# >>>>>>>

# 5. Después de resolver
git add archivo-resuelto.js
git commit -m "fix: resolve merge conflicts"
```

---

## ✅ Checklist antes de Pull Request

- [ ] Mi código funciona localmente
- [ ] Probé con `docker compose up --build`
- [ ] No hay errores en consola
- [ ] Hice commits descriptivos
- [ ] Mi branch está actualizada con `develop`
- [ ] Agregué/actualicé documentación si es necesario
- [ ] Probé las funcionalidades manualmente
- [ ] No commitié archivos sensibles (.env, etc.)

---

## 🎯 Orden Sugerido de Integración

Para evitar conflictos, seguir este orden:

1. **Leonardo** → Primero (base: roles en User)
2. **Alfredo** → Segundo (depende de Leonardo)
3. **Matías Morales** → En paralelo con Alfredo (independiente)
4. **Matías McIntire** → Último (documentación final)

**Timeline:**
- Día 1: Leonardo hace PR → Merge
- Día 2: Alfredo hace PR → Merge
- Día 2: Matías M hace PR → Merge
- Día 3: Matías Mc hace PR → Merge
- Día 3: Merge final `develop` → `main`

---

## 📞 Comunicación

**Canal recomendado:** WhatsApp/Discord/Slack del grupo

**Formato de mensaje cuando terminas:**
```
✅ [Tu nombre] - PR listo
Branch: feature/nombre-branch
Link: [url del PR]
Esperando review de: @nombre
```

---

## 🐛 Problemas Comunes

### Problema: "Your branch is behind"
```bash
git pull origin develop
# Resolver conflictos si hay
git push
```

### Problema: "Cannot push, rejected"
```bash
git pull --rebase origin develop
git push
```

### Problema: "Committed .env by mistake"
```bash
# ANTES de push
git reset HEAD~1
git restore --staged .env

# DESPUÉS de push (más complicado, avisar al equipo)
```

---

## 📚 Recursos

- **GitHub del proyecto:** https://github.com/MatiasMcintire/DDWGordont
- **Documentación:**
  - `README.md` - Instrucciones generales
  - `docs/API.md` - Documentación de API
  - `REPARTO-TAREAS.md` - Tareas detalladas
  - `PLAN-ENTREGA-3.md` - Plan de implementación

- **Comandos rápidos:**
  ```bash
  # Ver estado
  git status

  # Ver branches
  git branch -a

  # Cambiar de branch
  git checkout nombre-branch

  # Ver commits
  git log --oneline

  # Ver diferencias
  git diff
  ```

---

**Última actualización:** 3 de Diciembre 2025
**Responsable:** Matías McIntire
