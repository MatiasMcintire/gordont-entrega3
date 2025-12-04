# Plan de Implementación - Entrega 3

**Fecha:** 3 de Diciembre 2025
**Equipo:** Leonardo Aguilera, Alfredo Sanjuan, Matías Morales, Matías McIntire

---

## Estado Actual del Proyecto

### ✅ Ya Implementado (Funciona y cumple requisitos)

1. **Autenticación JWT**
   - ✅ POST /api/v1/auth/register (registro con validación completa)
   - ✅ POST /api/v1/auth/login (login con JWT)
   - ✅ GET /api/v1/auth/me (perfil del usuario autenticado)
   - ✅ Middleware authMiddleware funcional
   - ✅ Validación con Express Validator

2. **CRUD Completo del Recurso Principal (Entries)**
   - ✅ GET /api/v1/entries (listar comidas del usuario)
   - ✅ POST /api/v1/entries (crear comida)
   - ✅ GET /api/v1/entries/:id (obtener comida específica)
   - ✅ PUT /api/v1/entries/:id (actualizar comida)
   - ✅ DELETE /api/v1/entries/:id (eliminar comida)
   - ✅ Verificación de ownership (usuarios solo ven sus datos)

3. **Conexión a MongoDB**
   - ✅ Mongoose configurado correctamente
   - ✅ Schemas: User, Entry, Workout
   - ✅ Repositorios implementados

4. **Redis como Caché**
   - ✅ Redis configurado y funcionando
   - ✅ CacheService implementado
   - ✅ Middleware de caché aplicado a GET /entries
   - ✅ Invalidación automática de caché
   - ✅ Header X-Cache: HIT/MISS

5. **Docker**
   - ✅ Dockerfile multi-stage optimizado
   - ✅ docker-compose.yml con 3 servicios (API, MongoDB, Redis)
   - ✅ Health checks configurados
   - ✅ Volúmenes persistentes

6. **Infraestructura**
   - ✅ Express configurado con helmet, cors, compression
   - ✅ Rate limiting (100 req/15min general, 5 req/15min auth)
   - ✅ Sanitización contra NoSQL injection
   - ✅ Manejo de errores centralizado

---

## ❌ Falta Implementar (Único requisito pendiente)

### **Sistema de Roles (admin/usuario)**

**Requisito de rúbrica:**
> "Aplicación de roles (admin y usuario) en al menos 2 endpoints"

**Estado actual:**
- ❌ No existe campo `role` en el User schema
- ❌ No existe middleware `requireRole`
- ❌ No hay endpoints diferenciados por rol

**Qué hacer:**

1. **Agregar campo `role` al User schema**
   - Valores permitidos: `'usuario'` (default), `'admin'`
   - Asignar automáticamente 'usuario' en registro
   - Migración/seed para crear usuario admin inicial

2. **Crear middleware `requireRole`**
   ```javascript
   // src/presentation/middleware/roleMiddleware.js
   export const requireRole = (...allowedRoles) => (req, res, next) => {
     const userRole = req.user?.role;
     if (!allowedRoles.includes(userRole)) {
       return res.status(403).json({
         success: false,
         error: { message: 'Insufficient permissions' }
       });
     }
     next();
   };
   ```

3. **Aplicar roles en 2+ endpoints** (ejemplo):
   - **GET /api/v1/admin/users** (solo admin) - listar todos los usuarios
   - **DELETE /api/v1/admin/users/:id** (solo admin) - eliminar usuario
   - Alternativamente: aplicar `requireRole('admin')` en endpoints existentes

---

## Reparto de Tareas por Integrante

### 👨‍💻 Leonardo Aguilera - Autenticación y Roles

**Tareas:**
1. ✅ (YA HECHO) Verificar que POST /auth/register funcione correctamente
2. ✅ (YA HECHO) Verificar que POST /auth/login funcione correctamente
3. **NUEVO:** Agregar campo `role` al User schema
   - Archivo: `src/infrastructure/persistence/schemas/userSchema.js`
   - Agregar: `role: { type: String, enum: ['usuario', 'admin'], default: 'usuario' }`
4. **NUEVO:** Modificar AuthController para incluir `role` en el token JWT
   - Archivo: `src/presentation/controllers/AuthController.js`
   - Incluir `role` en el payload del JWT

**Tiempo estimado:** 1-2 horas
**Rama:** `feature/auth-roles`

---

### 👨‍💻 Alfredo Sanjuan - Middleware de Roles y Aplicación

**Tareas:**
1. **NUEVO:** Crear middleware `requireRole`
   - Archivo: `src/presentation/middleware/roleMiddleware.js`
   - Exportar función `requireRole(...allowedRoles)`
2. **NUEVO:** Modificar `authMiddleware` para incluir `role` en `req.user`
   - Archivo: `src/presentation/middleware/authMiddleware.js`
   - Extraer `role` del token y agregarlo a `req.user`
3. **NUEVO:** Aplicar roles en al menos 2 endpoints:
   - Opción A: Crear endpoints admin
     - `GET /api/v1/admin/users` (listar todos los usuarios)
     - `DELETE /api/v1/admin/users/:id` (eliminar usuario)
   - Opción B: Proteger endpoints existentes con rol admin
     - `GET /api/v1/entries/stats/daily` - agregar opción admin para ver stats de todos
4. **NUEVO:** Crear archivo de rutas `admin.routes.js`
   - Archivo: `src/presentation/routes/admin.routes.js`

**Tiempo estimado:** 2-3 horas
**Rama:** `feature/role-middleware`

---

### 👨‍💻 Matías Morales - Redis y Caché

**Tareas:**
1. ✅ (YA HECHO) Verificar que Redis esté funcionando como caché
2. ✅ (YA HECHO) Confirmar que GET /entries usa caché
3. **VERIFICACIÓN:** Probar caché con 2 llamadas consecutivas:
   ```bash
   # Primera llamada (cache MISS)
   curl -H "Authorization: Bearer <token>" http://localhost:3000/api/v1/entries
   # Segunda llamada (cache HIT)
   curl -H "Authorization: Bearer <token>" http://localhost:3000/api/v1/entries
   ```
4. **OPCIONAL:** Documentar comportamiento de caché en README
   - Explicar header `X-Cache: HIT/MISS`
   - Explicar TTL (tiempo de expiración)
   - Explicar invalidación automática

**Tiempo estimado:** 1 hora (verificación)
**Rama:** `feature/redis-validation`

---

### 👨‍💻 Matías McIntire - Docker y Documentación

**Tareas:**
1. ✅ (YA HECHO) Verificar que docker-compose.yml funcione
2. ✅ (YA HECHO) Confirmar que `docker compose up --build` levanta los 3 servicios
3. **MEJORAR:** Actualizar README.md con:
   - Sección de roles (admin/usuario)
   - Tabla de endpoints con roles requeridos
   - Instrucciones para crear usuario admin
4. **NUEVO:** Crear `/docs/API.md` con documentación completa:
   - Todos los endpoints
   - Request/Response examples
   - Códigos de estado HTTP
   - Roles requeridos por endpoint
5. **NUEVO:** Crear script de seed para usuario admin inicial
   - Archivo: `src/scripts/seedAdmin.js`
   - Crear usuario admin con credenciales conocidas
6. **OPCIONAL:** Crear scripts `.bat` o `.sh` para simplificar uso:
   - `setup.bat` - primer setup completo
   - `start.bat` - iniciar servicios
   - `stop.bat` - detener servicios
   - `seed-admin.bat` - crear usuario admin

**Tiempo estimado:** 2-3 horas
**Rama:** `feature/documentation`

---

## Checklist Final de Entrega

### Funcionalidades (100% de la rúbrica)

- [x] Registro e inicio de sesión con JWT
  - [x] POST /api/v1/auth/register
  - [x] POST /api/v1/auth/login
- [ ] Aplicación de roles (admin y usuario) en al menos 2 endpoints
  - [ ] Campo `role` en User model
  - [ ] Middleware `requireRole`
  - [ ] Al menos 2 endpoints con verificación de rol
- [x] CRUD completo del recurso principal
  - [x] GET /api/v1/entries
  - [x] POST /api/v1/entries
  - [x] GET /api/v1/entries/:id
  - [x] PUT /api/v1/entries/:id
  - [x] DELETE /api/v1/entries/:id
- [x] Conexión funcional a MongoDB
- [x] Uso de Redis como caché en al menos un GET endpoint
- [x] Docker con docker-compose.yml
  - [x] API en Node.js/Express
  - [x] MongoDB
  - [x] Redis
- [x] API accesible en http://localhost:3000

### Documentación

- [x] README.md con pasos para levantar proyecto
- [ ] Documentación de endpoints actualizada con roles
- [ ] /docs/API.md o documentación equivalente

### Infraestructura

- [x] Dockerfile funcionando
- [x] docker-compose.yml funcionando
- [x] JWT implementado correctamente
- [x] Redis funcionando como caché

### Control de Versiones

- [ ] Rama `develop` como principal
- [ ] Ramas feature por tarea
- [ ] Commits descriptivos
- [ ] Pull Requests con revisiones
- [ ] Merge final a `main`

---

## Estrategia de Integración

### Orden de implementación:

1. **Leonardo** (feature/auth-roles):
   - Agregar campo `role` a User schema
   - Incluir `role` en JWT payload
   - PR → develop

2. **Alfredo** (feature/role-middleware):
   - Esperar merge de Leonardo
   - Crear middleware requireRole
   - Crear endpoints admin
   - PR → develop

3. **Matías Morales** (feature/redis-validation):
   - Puede trabajar en paralelo
   - Verificar y documentar Redis
   - PR → develop

4. **Matías McIntire** (feature/documentation):
   - Esperar merge de Alfredo (para documentar roles)
   - Actualizar README y crear API.md
   - Crear seeds y scripts
   - PR → develop

5. **Merge final:**
   - develop → main
   - Tag: v1.0.0-entrega3

---

## Endpoints Finales Esperados

### Autenticación (sin rol requerido)
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- GET /api/v1/auth/me (requiere JWT)

### Entries/Comidas (requiere JWT, rol: usuario o admin)
- GET /api/v1/entries
- POST /api/v1/entries
- GET /api/v1/entries/:id
- PUT /api/v1/entries/:id
- DELETE /api/v1/entries/:id
- GET /api/v1/entries/stats/daily

### Workouts (requiere JWT, rol: usuario o admin)
- GET /api/v1/workouts
- POST /api/v1/workouts
- GET /api/v1/workouts/:id
- PUT /api/v1/workouts/:id
- DELETE /api/v1/workouts/:id

### Admin (requiere JWT, rol: admin)
- **NUEVO** GET /api/v1/admin/users (listar todos los usuarios)
- **NUEVO** DELETE /api/v1/admin/users/:id (eliminar usuario)

### Otros
- GET /health

---

## Notas Importantes

1. **No agregar funcionalidades extra** - Solo lo necesario para cumplir rúbrica
2. **Commits frecuentes y descriptivos** - Facilita revisión y debugging
3. **Pull Requests pequeños** - Más fácil de revisar
4. **Probar localmente antes de PR** - `docker compose up --build` debe funcionar
5. **Documentar todo** - README y API.md deben estar completos

---

## Criterios de Defensa

Durante la defensa, estar preparados para explicar:

1. **Autenticación:** Cómo funciona JWT, cómo se genera, cómo se valida
2. **Roles:** Diferencia entre admin y usuario, cómo se verifica el rol
3. **CRUD:** Mostrar cada endpoint funcionando, explicar validaciones
4. **MongoDB:** Explicar schemas, relaciones, índices
5. **Redis:** Demostrar cache HIT/MISS, explicar invalidación
6. **Docker:** Explicar docker-compose.yml, healthchecks, volúmenes

---

**Próximos pasos inmediatos:**
1. Crear ramas feature correspondientes
2. Leonardo y Matías Morales pueden empezar inmediatamente (tareas independientes)
3. Alfredo espera merge de Leonardo
4. Matías McIntire espera merge de Alfredo para documentación final
