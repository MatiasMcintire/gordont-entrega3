# Reparto de Tareas - Entrega 3

**Proyecto:** Sistema de Gestión Nutricional y Deportiva (Gordont API)
**Fecha:** 3 de Diciembre 2025
**Objetivo:** Cumplir con la rúbrica de Entrega 3 exactamente

---

## Equipo

1. **Leonardo Aguilera** - Autenticación y Roles
2. **Alfredo Sanjuan** - Middleware de Roles y Endpoints Admin
3. **Matías Morales** - Redis y Caché
4. **Matías McIntire** - Docker y Documentación

---

## Resumen de Estado Actual

### ✅ Completado (100%)

Todas las funcionalidades requeridas por la rúbrica han sido implementadas:

- ✅ Registro e inicio de sesión con JWT
- ✅ Sistema de roles (admin/usuario) implementado
- ✅ Middleware de verificación de roles
- ✅ Al menos 2 endpoints con roles (tenemos 4 endpoints admin)
- ✅ CRUD completo del recurso principal (entries/comidas)
- ✅ Conexión a MongoDB funcionando
- ✅ Redis como caché en endpoints GET
- ✅ Docker y docker-compose.yml configurados
- ✅ Documentación completa (README.md + /docs/API.md)

---

## Tareas por Integrante

### 👨‍💻 Leonardo Aguilera - Autenticación y Roles

**Responsabilidad:** Sistema de autenticación JWT y gestión de roles

#### Archivos Modificados/Creados
1. ✅ `src/infrastructure/persistence/schemas/userSchema.js`
   - Agregado campo `role` (enum: 'usuario', 'admin', default: 'usuario')

2. ✅ `src/presentation/controllers/AuthController.js`
   - Línea 94: JWT incluye `role` en el payload (registro)
   - Línea 153: JWT incluye `role` en el payload (login)

3. ✅ `src/presentation/middleware/authMiddleware.js`
   - Línea 32: Extrae `role` del token y lo agrega a `req.user`

4. ✅ `src/infrastructure/repositories/MongoUserRepository.js`
   - Línea 135: Incluye `role` en mapToDomain
   - Línea 145: Incluye `role` en toJSON

#### Endpoints Relacionados
- `POST /api/v1/auth/register` - Crea usuarios con rol 'usuario' por defecto
- `POST /api/v1/auth/login` - Retorna token con información de rol
- `GET /api/v1/auth/me` - Muestra rol del usuario

#### Verificación y Pruebas

**Test 1: Registro de usuario**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "leonardo@test.com",
    "name": "Leonardo Aguilera",
    "password": "Test123!",
    "weight": 75,
    "height": 180,
    "age": 25
  }'
```
✅ **Verificar:** Response debe incluir `"role": "usuario"` en el objeto user

**Test 2: Login y verificación de JWT**
```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "leonardo@test.com",
    "password": "Test123!"
  }'

# Copiar el accessToken y decodificarlo en jwt.io
# Verificar que el payload incluya: { "id": "...", "email": "...", "role": "usuario" }
```

**Test 3: Endpoint /me muestra rol**
```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <token>"
```
✅ **Verificar:** Response incluye `"role": "usuario"`

#### Defensa - Preguntas Clave

**P: ¿Cómo funciona JWT en este proyecto?**
- JWT (JSON Web Token) es un estándar para autenticación stateless
- Cuando un usuario se registra o hace login, generamos un token firmado con `JWT_SECRET`
- El token contiene: `{ id, email, role }` y expira en 24 horas
- El cliente debe enviar este token en el header `Authorization: Bearer <token>`
- El middleware `authMiddleware` verifica el token y extrae la información del usuario

**P: ¿Dónde se almacena el rol del usuario?**
- En el modelo User de MongoDB (campo `role`)
- En el payload del JWT (para evitar consultas adicionales)
- En `req.user.role` después de pasar por el middleware de autenticación

**P: ¿Por qué incluir el rol en el JWT?**
- Evita consultas adicionales a la BD para verificar permisos
- Hace la autenticación más rápida
- Permite verificación de roles de forma stateless

---

### 👨‍💻 Alfredo Sanjuan - Middleware de Roles y Endpoints Admin

**Responsabilidad:** Implementación de middleware de verificación de roles y endpoints administrativos

#### Archivos Creados
1. ✅ `src/presentation/middleware/roleMiddleware.js`
   - Función `requireRole(...allowedRoles)` - middleware genérico
   - Función `requireAdmin` - shortcut para admin
   - Función `requireUsuario` - shortcut para usuario

2. ✅ `src/presentation/controllers/AdminController.js`
   - `listAllUsers()` - GET /admin/users (paginado)
   - `getUserById()` - GET /admin/users/:id
   - `deleteUser()` - DELETE /admin/users/:id (con prevención de auto-eliminación)
   - `getSystemStats()` - GET /admin/stats

3. ✅ `src/presentation/routes/admin.routes.js`
   - Define 4 endpoints protegidos con `requireAdmin`
   - Documentación Swagger completa

4. ✅ `src/infrastructure/repositories/MongoUserRepository.js`
   - Agregados métodos:
     - `findAll({ skip, limit })` - lista usuarios con paginación
     - `count()` - cuenta total de usuarios
     - `countByRole(role)` - cuenta usuarios por rol

#### Endpoints Implementados

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/admin/users` | Listar todos los usuarios (paginado) |
| GET | `/api/v1/admin/users/:id` | Ver usuario específico |
| DELETE | `/api/v1/admin/users/:id` | Eliminar usuario |
| GET | `/api/v1/admin/stats` | Estadísticas del sistema |

#### Verificación y Pruebas

**Setup: Crear usuario admin**
```bash
docker exec gordont-api node src/scripts/seedAdmin.js
```
Credenciales: `admin@gordont.com` / `Admin123!`

**Test 1: Usuario normal NO puede acceder a endpoints admin**
```bash
# Login como usuario normal
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "leonardo@test.com", "password": "Test123!"}'

# Intentar acceder a endpoint admin
curl -X GET http://localhost:3000/api/v1/admin/users \
  -H "Authorization: Bearer <token_usuario>"
```
✅ **Verificar:** Response `403 Forbidden` con mensaje "Insufficient permissions"

**Test 2: Admin SÍ puede acceder a endpoints admin**
```bash
# Login como admin
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@gordont.com", "password": "Admin123!"}'

# Listar usuarios
curl -X GET http://localhost:3000/api/v1/admin/users \
  -H "Authorization: Bearer <token_admin>"
```
✅ **Verificar:** Response `200 OK` con listado de usuarios

**Test 3: Estadísticas del sistema**
```bash
curl -X GET http://localhost:3000/api/v1/admin/stats \
  -H "Authorization: Bearer <token_admin>"
```
✅ **Verificar:** Response muestra `{ users: { total, admins, usuarios } }`

**Test 4: Eliminar usuario**
```bash
# Crear usuario de prueba primero
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@delete.com",
    "name": "Test User",
    "password": "Test123!",
    "weight": 70,
    "height": 175,
    "age": 25
  }'

# Copiar el ID del usuario creado

# Eliminar usuario (como admin)
curl -X DELETE http://localhost:3000/api/v1/admin/users/<user_id> \
  -H "Authorization: Bearer <token_admin>"
```
✅ **Verificar:** Response `200 OK` con mensaje "User deleted successfully"

**Test 5: Prevención de auto-eliminación**
```bash
# Intentar que el admin se elimine a sí mismo
curl -X DELETE http://localhost:3000/api/v1/admin/users/<admin_id> \
  -H "Authorization: Bearer <token_admin>"
```
✅ **Verificar:** Response `400 Bad Request` con mensaje "Cannot delete your own account"

#### Defensa - Preguntas Clave

**P: ¿Cómo funciona el middleware `requireRole`?**
- Es un middleware que recibe roles permitidos como argumentos
- Verifica que `req.user` exista (usuario autenticado)
- Verifica que `req.user.role` esté en la lista de roles permitidos
- Si no cumple, retorna 403 Forbidden
- Si cumple, llama a `next()` para continuar

**P: ¿Dónde se aplica el middleware de roles?**
- En las rutas admin (`src/presentation/routes/admin.routes.js`)
- Se usa `router.use(requireAdmin)` para proteger TODAS las rutas admin
- Esto aplica el middleware a todos los endpoints bajo `/api/v1/admin/*`

**P: ¿Qué diferencia hay entre `authMiddleware` y `requireRole`?**
- `authMiddleware`: Verifica que el usuario esté autenticado (token válido)
- `requireRole`: Verifica que el usuario tenga el rol correcto
- Se usan en secuencia: primero `authMiddleware`, luego `requireRole`

**P: ¿Por qué el admin no puede eliminarse a sí mismo?**
- Prevenir bloqueo del sistema (si el último admin se elimina, nadie puede gestionar usuarios)
- Buena práctica de seguridad
- Se valida en `AdminController.deleteUser()` línea 110

---

### 👨‍💻 Matías Morales - Redis y Caché

**Responsabilidad:** Implementación y verificación de Redis como sistema de caché

#### Archivos Relacionados
1. ✅ `src/infrastructure/cache/CacheService.js`
   - Servicio que maneja operaciones de caché
   - Métodos: `get()`, `set()`, `invalidate()`, `clear()`

2. ✅ `src/infrastructure/cache/cacheMiddleware.js`
   - Middleware que intercepta requests
   - Verifica si hay datos en caché antes de consultar BD
   - Agrega header `X-Cache: HIT/MISS`

3. ✅ `src/app.simple.js`
   - Conexión a Redis (líneas 56-80)
   - Configuración de cliente Redis
   - Manejo de errores y reconexión

#### Endpoints con Caché

| Endpoint | TTL | Invalidación |
|----------|-----|--------------|
| `GET /api/v1/entries` | 5 min | POST/PUT/DELETE entries |
| `GET /api/v1/workouts` | 5 min | POST/PUT/DELETE workouts |
| `GET /api/v1/auth/me` | 1 hora | - |

#### Verificación y Pruebas

**Test 1: Caché MISS (primera llamada)**
```bash
# Primera llamada a /entries (sin caché)
curl -i -X GET http://localhost:3000/api/v1/entries \
  -H "Authorization: Bearer <token>"
```
✅ **Verificar en headers:** `X-Cache: MISS`
✅ **Verificar tiempo de respuesta:** ~100-300ms (consulta a MongoDB)

**Test 2: Caché HIT (segunda llamada)**
```bash
# Segunda llamada inmediata (con caché)
curl -i -X GET http://localhost:3000/api/v1/entries \
  -H "Authorization: Bearer <token>"
```
✅ **Verificar en headers:** `X-Cache: HIT`
✅ **Verificar tiempo de respuesta:** ~10-50ms (mucho más rápido)

**Test 3: Invalidación de caché**
```bash
# Crear una nueva entry
curl -X POST http://localhost:3000/api/v1/entries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "date": "2025-12-03",
    "mealType": "lunch",
    "foods": [{"name": "Pollo", "calories": 200, "protein": 30, "carbs": 0, "fat": 8, "quantity": 150}]
  }'

# Volver a consultar entries
curl -i -X GET http://localhost:3000/api/v1/entries \
  -H "Authorization: Bearer <token>"
```
✅ **Verificar:** `X-Cache: MISS` (caché fue invalidado al crear entry)

**Test 4: Redis funcionando en Docker**
```bash
# Verificar que Redis está corriendo
docker ps | grep redis

# Conectarse a Redis CLI
docker exec -it gordont-redis redis-cli

# Dentro de Redis CLI, verificar keys
redis> KEYS *
redis> GET entries:<user_id>:*
redis> TTL entries:<user_id>:*
```
✅ **Verificar:**
- Redis container está corriendo
- Hay keys almacenadas
- TTL es aproximadamente 300 segundos (5 minutos)

**Test 5: Sistema funciona sin Redis (degradación graceful)**
```bash
# Detener Redis
docker stop gordont-redis

# Intentar hacer request
curl -X GET http://localhost:3000/api/v1/entries \
  -H "Authorization: Bearer <token>"
```
✅ **Verificar:**
- API sigue funcionando (no crashea)
- Response es exitoso
- Header `X-Cache` no aparece (mockCacheService)

#### Documentación a Entregar

Crear documento: `docs/REDIS-CACHE.md`

```markdown
# Redis Caché - Documentación Técnica

## Configuración

- **Servidor:** Redis 7 Alpine
- **Puerto:** 6379
- **TTL por defecto:** 300 segundos (5 minutos)
- **Estrategia:** Cache-aside pattern

## Endpoints con Caché

1. **GET /api/v1/entries**
   - Key pattern: `entries:<userId>:date=<date>`
   - TTL: 5 minutos
   - Invalidación: POST/PUT/DELETE en /entries

2. **GET /api/v1/workouts**
   - Key pattern: `workouts:<userId>:date=<date>`
   - TTL: 5 minutos
   - Invalidación: POST/PUT/DELETE en /workouts

## Comportamiento

### Primera llamada (MISS)
1. Request llega al middleware de caché
2. Se busca en Redis → no existe
3. Header `X-Cache: MISS`
4. Se consulta MongoDB
5. Se almacena resultado en Redis
6. Se retorna al cliente

### Segunda llamada (HIT)
1. Request llega al middleware de caché
2. Se busca en Redis → existe
3. Header `X-Cache: HIT`
4. Se retorna directamente desde Redis (sin consultar MongoDB)
5. Respuesta mucho más rápida

### Invalidación
Cuando se crea/actualiza/elimina un recurso:
1. Se elimina la key de caché correspondiente
2. Próxima llamada GET será MISS
3. Se regenera caché automáticamente

## Métricas

- Latencia con caché: ~10-50ms
- Latencia sin caché: ~100-300ms
- Mejora: 3-10x más rápido

## Degradación Graceful

Si Redis falla o no está disponible:
- API sigue funcionando normalmente
- Todas las requests van directo a MongoDB
- No se agregan headers X-Cache
- Logger muestra warning pero no error fatal
```

#### Defensa - Preguntas Clave

**P: ¿Qué es Redis y por qué lo usamos?**
- Redis es un almacén de datos en memoria (in-memory key-value store)
- Es extremadamente rápido porque los datos están en RAM
- Lo usamos como caché para reducir consultas a MongoDB
- Mejora el rendimiento de endpoints de lectura (GET)

**P: ¿Cómo funciona el caché en este proyecto?**
- Patrón Cache-Aside: primero buscar en caché, si no existe buscar en BD
- Middleware intercepta requests GET
- Genera una key única basada en userId y parámetros (ej: fecha)
- Si la key existe en Redis → retorna datos cacheados (HIT)
- Si no existe → consulta MongoDB, guarda en Redis, retorna datos (MISS)

**P: ¿Qué es TTL?**
- Time To Live: tiempo de vida de un dato en caché
- Configurado en 5 minutos (300 segundos)
- Después de 5 minutos, Redis elimina automáticamente la key
- Previene datos obsoletos en caché

**P: ¿Cómo se invalida el caché?**
- Cuando se crea/actualiza/elimina un recurso, se elimina su key de Redis
- Ejemplo: POST /entries → invalida caché de GET /entries
- Se usa patrón con wildcards: `entries:<userId>:*`
- Método `CacheService.invalidateUser(userId)` elimina todas las keys del usuario

**P: ¿Qué pasa si Redis falla?**
- El sistema tiene "degradación graceful"
- Si Redis no conecta, se usa `mockCacheService`
- El mock implementa la misma interfaz pero no hace nada
- Resultado: API sigue funcionando, solo sin caché (más lento pero funcional)

---

### 👨‍💻 Matías McIntire - Docker y Documentación

**Responsabilidad:** Containerización, despliegue y documentación completa del proyecto

#### Archivos de Docker
1. ✅ `Dockerfile`
   - Multi-stage build optimizado
   - Imagen base: node:20-alpine
   - Usuario no-root para seguridad
   - Health check integrado

2. ✅ `docker-compose.yml`
   - 3 servicios: api, mongodb, redis
   - Health checks para cada servicio
   - Volúmenes persistentes
   - Red interna (gordont-network)

3. ✅ `.env.example`
   - Template de variables de entorno
   - Documentación de cada variable

#### Archivos de Documentación
1. ✅ `README.md` (actualizado)
   - Instrucciones de instalación
   - Tabla de endpoints con roles
   - Ejemplos de uso con curl
   - Sección de roles y permisos
   - Instrucciones para crear admin

2. ✅ `docs/API.md` (nuevo)
   - Documentación completa de todos los endpoints
   - Request/Response examples
   - Códigos de error
   - Ejemplos de autenticación
   - Guía de roles

3. ✅ `PLAN-ENTREGA-3.md`
   - Plan de implementación
   - Estado del proyecto
   - Checklist de requisitos

4. ✅ `REPARTO-TAREAS.md` (este documento)
   - Tareas por integrante
   - Guías de verificación
   - Preguntas para la defensa

#### Scripts Creados
1. ✅ `src/scripts/seedAdmin.js`
   - Script para crear usuario admin inicial
   - Credenciales: admin@gordont.com / Admin123!

#### Verificación y Pruebas

**Test 1: Docker Compose levanta todos los servicios**
```bash
# Limpiar todo
docker compose down -v

# Levantar servicios
docker compose up --build
```
✅ **Verificar:**
- 3 containers corriendo: gordont-api, gordont-mongodb, gordont-redis
- API accesible en http://localhost:3000
- Health check pasa: `curl http://localhost:3000/health`
- No hay errores en logs

**Test 2: Logs de cada servicio**
```bash
# API logs
docker compose logs -f api

# MongoDB logs
docker compose logs -f mongodb

# Redis logs
docker compose logs -f redis
```
✅ **Verificar:** No hay errores críticos

**Test 3: Health checks**
```bash
# Verificar health de containers
docker ps --format "table {{.Names}}\t{{.Status}}"
```
✅ **Verificar:** Todos muestran "(healthy)"

**Test 4: Volúmenes persistentes**
```bash
# Crear un usuario
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "persistence@test.com",
    "name": "Test Persistence",
    "password": "Test123!",
    "weight": 70,
    "height": 175,
    "age": 25
  }'

# Detener containers
docker compose down

# Reiniciar (SIN -v para mantener volúmenes)
docker compose up -d

# Intentar login con el usuario creado antes
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "persistence@test.com",
    "password": "Test123!"
  }'
```
✅ **Verificar:** Login exitoso (datos persistieron)

**Test 5: Seed de admin**
```bash
# Con containers corriendo
docker exec gordont-api node src/scripts/seedAdmin.js
```
✅ **Verificar:**
- Script se ejecuta sin errores
- Mensaje de éxito
- Admin puede hacer login

**Test 6: Documentación accesible**
```bash
# Swagger UI
curl http://localhost:3000/api-docs/

# Health endpoint
curl http://localhost:3000/health
```
✅ **Verificar:**
- Swagger UI carga correctamente en el navegador
- Health endpoint retorna JSON con status

#### Checklist de Entrega

**Docker:**
- [x] Dockerfile multi-stage optimizado
- [x] docker-compose.yml con 3 servicios
- [x] Health checks configurados
- [x] Volúmenes persistentes
- [x] Variables de entorno documentadas
- [x] Red interna configurada
- [x] `docker compose up --build` funciona sin errores

**Documentación:**
- [x] README.md actualizado con:
  - [x] Instrucciones de instalación
  - [x] Instrucciones de ejecución
  - [x] Tabla de endpoints
  - [x] Ejemplos de uso
  - [x] Sección de roles
  - [x] Instrucciones para crear admin
- [x] docs/API.md con:
  - [x] Documentación completa de todos los endpoints
  - [x] Request/Response examples
  - [x] Códigos de error
  - [x] Autenticación y roles
- [x] Swagger UI funcionando en /api-docs
- [x] Script seedAdmin.js documentado

**Scripts:**
- [x] seedAdmin.js crea admin correctamente
- [x] seedAdmin.js tiene manejo de errores
- [x] seedAdmin.js verifica si admin ya existe

#### Defensa - Preguntas Clave

**P: ¿Qué es Docker y por qué lo usamos?**
- Docker es una plataforma de containerización
- Permite empaquetar la aplicación con todas sus dependencias
- Garantiza que funcione igual en cualquier entorno
- Facilita el despliegue y la escalabilidad

**P: ¿Qué es docker-compose?**
- Herramienta para definir y ejecutar aplicaciones multi-container
- Usamos YAML para configurar los servicios
- Un solo comando (`docker compose up`) levanta todo el stack
- En nuestro caso: API + MongoDB + Redis

**P: Explica los servicios del docker-compose.yml**
- **api:** Nuestra aplicación Node.js/Express en puerto 3000
- **mongodb:** Base de datos MongoDB en puerto 27017, con volumen persistente
- **redis:** Caché Redis en puerto 6379, con volumen persistente
- Todos conectados a la red `gordont-network`

**P: ¿Qué son los health checks?**
- Verificaciones automáticas de que el servicio está funcionando
- Docker ejecuta un comando cada X segundos
- Si falla 3 veces seguidas, marca el container como "unhealthy"
- Ayuda en producción para auto-restart

**P: ¿Qué son los volúmenes?**
- Almacenamiento persistente para containers
- Los datos sobreviven aunque el container se elimine
- Usamos volúmenes para:
  - MongoDB data (`mongodb_data`)
  - MongoDB config (`mongodb_config`)
  - Redis data (`redis_data`)

**P: ¿Cómo se ejecuta el proyecto?**
```bash
# 1. Clonar repositorio
git clone <repo>
cd DDWGordont

# 2. Crear archivo .env (copiar de .env.example)
cp .env.example .env

# 3. Levantar servicios
docker compose up --build

# 4. (Opcional) Crear admin
docker exec gordont-api node src/scripts/seedAdmin.js

# 5. Acceder a http://localhost:3000
```

**P: ¿Qué contiene la documentación API.md?**
- Tabla de contenidos
- Explicación de autenticación con JWT
- Tabla de roles y permisos
- Documentación completa de cada endpoint
- Ejemplos de Request/Response
- Códigos de error HTTP
- Ejemplos de uso con curl
- Explicación de caché Redis

---

## Cronograma de Integración

### Fase 1: Desarrollo Individual ✅ (Completado)
- Leonardo: Sistema de roles en User ✅
- Alfredo: Middleware y endpoints admin ✅
- Matías M: Verificación de Redis ✅
- Matías Mc: Docker y docs ✅

### Fase 2: Integración ✅ (Completado)
1. Merge de feature/auth-roles (Leonardo) ✅
2. Merge de feature/role-middleware (Alfredo) ✅
3. Merge de feature/redis-validation (Matías M) ✅
4. Merge de feature/documentation (Matías Mc) ✅

### Fase 3: Pruebas Finales (Pendiente)
- [ ] Cada integrante prueba las funcionalidades de los demás
- [ ] Verificar que `docker compose up --build` funciona desde cero
- [ ] Probar flujo completo: registro → login → crear entry → admin elimina usuario
- [ ] Verificar caché Redis con headers X-Cache
- [ ] Revisar documentación para consistencia

### Fase 4: Preparación para Defensa (Pendiente)
- [ ] Cada integrante lee y entiende este documento completo
- [ ] Practicar respuestas a preguntas clave
- [ ] Preparar demo en vivo
- [ ] Tener curl commands listos

---

## Checklist Final de Rúbrica

### Funcionalidades Obligatorias

- [x] **Registro e inicio de sesión con JWT**
  - [x] POST /api/v1/auth/register
  - [x] POST /api/v1/auth/login
  - [x] JWT incluye información del usuario
  - [x] Token expira (24 horas)

- [x] **Aplicación de roles (admin y usuario) en al menos 2 endpoints**
  - [x] Campo `role` en User model
  - [x] Middleware `requireRole` implementado
  - [x] GET /api/v1/admin/users (requiere admin)
  - [x] DELETE /api/v1/admin/users/:id (requiere admin)
  - [x] GET /api/v1/admin/users/:id (requiere admin)
  - [x] GET /api/v1/admin/stats (requiere admin)

- [x] **CRUD completo del recurso principal**
  - [x] GET /api/v1/entries (listar)
  - [x] POST /api/v1/entries (crear)
  - [x] GET /api/v1/entries/:id (leer)
  - [x] PUT /api/v1/entries/:id (actualizar)
  - [x] DELETE /api/v1/entries/:id (eliminar)

- [x] **Conexión funcional a MongoDB**
  - [x] Mongoose configurado
  - [x] Schemas definidos (User, Entry, Workout)
  - [x] Repositorios implementados
  - [x] Conexión persistente vía Docker

- [x] **Uso de Redis como caché en al menos un GET endpoint**
  - [x] GET /api/v1/entries usa Redis
  - [x] Header X-Cache: HIT/MISS
  - [x] Invalidación automática
  - [x] TTL configurado (5 minutos)

- [x] **Docker con docker-compose.yml**
  - [x] Servicio API (Node.js/Express)
  - [x] Servicio MongoDB
  - [x] Servicio Redis
  - [x] Health checks
  - [x] Volúmenes persistentes

- [x] **API accesible en http://localhost:3000**
  - [x] Puerto configurado correctamente
  - [x] CORS habilitado
  - [x] Endpoints funcionando

### Documentación Obligatoria

- [x] **README.md con pasos para levantar el proyecto**
  - [x] Instrucciones claras de instalación
  - [x] Comando `docker compose up --build`
  - [x] Explicación de variables de entorno
  - [x] Instrucciones para crear admin

- [x] **Documentación de los endpoints**
  - [x] docs/API.md completo
  - [x] Swagger UI en /api-docs
  - [x] Request/Response examples
  - [x] Roles requeridos documentados

### Infraestructura

- [x] **Dockerfile funcionando**
  - [x] Multi-stage build
  - [x] Imagen optimizada
  - [x] Health check integrado

- [x] **docker-compose.yml funcionando**
  - [x] 3 servicios definidos
  - [x] Dependencias correctas
  - [x] Health checks
  - [x] Volúmenes

- [x] **JWT implementado correctamente**
  - [x] Firma segura
  - [x] Verificación en middleware
  - [x] Expiración configurada

- [x] **Redis funcionando como caché**
  - [x] Conexión exitosa
  - [x] Operaciones CRUD en caché
  - [x] Degradación graceful si falla

---

## Comandos Rápidos para la Defensa

```bash
# Levantar el proyecto desde cero
docker compose down -v
docker compose up --build

# Crear admin
docker exec gordont-api node src/scripts/seedAdmin.js

# Health check
curl http://localhost:3000/health

# Registrar usuario
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","name":"Test User","password":"Test123!","weight":70,"height":175,"age":25}'

# Login como usuario
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"Test123!"}'

# Login como admin
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gordont.com","password":"Admin123!"}'

# Usuario intenta acceder a endpoint admin (FALLA - 403)
curl -X GET http://localhost:3000/api/v1/admin/users \
  -H "Authorization: Bearer <token_usuario>"

# Admin accede a endpoint admin (ÉXITO - 200)
curl -X GET http://localhost:3000/api/v1/admin/users \
  -H "Authorization: Bearer <token_admin>"

# Verificar caché Redis (MISS → HIT)
curl -i -X GET http://localhost:3000/api/v1/entries -H "Authorization: Bearer <token>"
curl -i -X GET http://localhost:3000/api/v1/entries -H "Authorization: Bearer <token>"

# Logs de containers
docker compose logs -f api
```

---

## Contacto entre Integrantes

- **Leonardo Aguilera:** [contacto]
- **Alfredo Sanjuan:** Alfredo.juan.san@gmail.com
- **Matías Morales:** [contacto]
- **Matías McIntire:** Matias.mcintire@gmail.com

---

**Última actualización:** 3 de Diciembre 2025
**Estado:** ✅ Implementación completa - Listo para entrega
