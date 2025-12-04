# Sistema de Gestión Nutricional y Deportiva - Gordont API

**Autores:** Matías McIntire, Alfredo SanJuan
**Curso:** Bases de Datos
**Fecha:** Noviembre 2025

---

## Descripción

API RESTful para gestión nutricional y deportiva personalizada. Permite a los usuarios:
- Registrarse y autenticarse con JWT
- Registrar sus comidas diarias con macronutrientes
- Registrar entrenamientos y ejercicios
- Ver estadísticas de progreso

---

## Tecnologías Utilizadas

- **Backend:** Node.js 20 + Express 4.18
- **Base de Datos:** MongoDB 7 (con Mongoose)
- **Cache:** Redis 7
- **Autenticación:** JWT (JSON Web Tokens)
- **Containerización:** Docker + Docker Compose

---

## Instrucciones de Ejecución

### Prerequisitos

- Docker y Docker Compose instalados
- Git

### Pasos

1. **Clonar el repositorio:**
```bash
git clone <repositorio>
cd DDWGordont
```

2. **Configurar variables de entorno:**

Crear un archivo `.env` en la raíz del proyecto con:

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://mongodb:27017/gordont
REDIS_URL=redis://redis:6379
REDIS_ENABLED=true
JWT_SECRET=tu-secret-super-seguro-minimo-64-caracteres-aqui
REFRESH_TOKEN_SECRET=otro-secret-diferente-tambien-de-64-caracteres
CORS_ORIGIN=*
```

3. **Iniciar la aplicación:**
```bash
docker compose up --build
```

4. **Crear usuario administrador inicial (opcional):**

Después de que los servicios estén corriendo, en otra terminal ejecuta:

```bash
docker exec gordont-api node src/scripts/seedAdmin.js
```

Esto creará un usuario admin con las siguientes credenciales:
- **Email:** `admin@gordont.com`
- **Password:** `Admin123!`

⚠️ **IMPORTANTE:** Cambia la contraseña después del primer inicio de sesión.

5. **Acceder a la aplicación:**
- API: http://localhost:3000
- Documentación Swagger: http://localhost:3000/api-docs
- Health Check: http://localhost:3000/health

---

## Arquitectura del Sistema

```
┌─────────────┐
│   Cliente   │
└──────┬──────┘
       │ HTTP/HTTPS
       ▼
┌─────────────────────────┐
│    API (Node.js)        │
│    Puerto: 3000         │
│  - Autenticación JWT    │
│  - Validación           │
│  - Cache Middleware     │
└────┬──────────────┬─────┘
     │              │
     ▼              ▼
┌─────────┐    ┌─────────┐
│ MongoDB │    │  Redis  │
│ :27017  │    │  :6379  │
└─────────┘    └─────────┘
```

**Servicios Docker:**
- **api:** Aplicación Node.js (puerto 3000)
- **mongodb:** Base de datos MongoDB (puerto 27017)
- **redis:** Cache Redis (puerto 6379)

---

## Modelo de Datos

### Colecciones MongoDB

#### 1. users
```javascript
{
  _id: ObjectId,
  email: String (único),
  name: String,
  passwordHash: String,
  weight: Number (kg),
  height: Number (cm),
  age: Number,
  createdAt: Date,
  updatedAt: Date
}
```

#### 2. entries (Comidas)
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: users),
  date: Date,
  mealType: String (breakfast|lunch|dinner|snack),
  foods: [
    {
      name: String,
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number,
      quantity: Number
    }
  ],
  notes: String,
  totalCalories: Number (calculado),
  totalProtein: Number (calculado),
  totalCarbs: Number (calculado),
  totalFat: Number (calculado),
  createdAt: Date,
  updatedAt: Date
}
```

#### 3. workouts (Entrenamientos)
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: users),
  date: Date,
  type: String (strength|cardio|flexibility|sports|other),
  exercises: [
    {
      name: String,
      sets: Number,
      reps: Number,
      weight: Number (kg),
      duration: Number (segundos),
      notes: String
    }
  ],
  duration: Number (segundos totales),
  caloriesBurned: Number,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Relaciones:**
- Un usuario tiene muchas entries (1:N)
- Un usuario tiene muchos workouts (1:N)

**Índices:**
- `users.email` (único)
- `entries.userId + entries.date`
- `workouts.userId + workouts.date`

---

## Endpoints Principales

### Tabla Completa de Endpoints

| Método | Endpoint | Descripción | Rol Requerido | Cache |
|--------|----------|-------------|---------------|-------|
| **Autenticación** |
| POST | `/api/v1/auth/register` | Registrar nuevo usuario | Público | ❌ |
| POST | `/api/v1/auth/login` | Iniciar sesión | Público | ❌ |
| GET | `/api/v1/auth/me` | Ver perfil propio | Autenticado | ✅ |
| **Entries (Comidas)** |
| GET | `/api/v1/entries` | Listar mis comidas | Usuario/Admin | ✅ |
| POST | `/api/v1/entries` | Crear comida | Usuario/Admin | ❌ |
| GET | `/api/v1/entries/:id` | Ver comida específica | Usuario/Admin | ❌ |
| PUT | `/api/v1/entries/:id` | Actualizar comida | Usuario/Admin | ❌ |
| DELETE | `/api/v1/entries/:id` | Eliminar comida | Usuario/Admin | ❌ |
| GET | `/api/v1/entries/stats/daily` | Estadísticas diarias | Usuario/Admin | ✅ |
| **Workouts (Entrenamientos)** |
| GET | `/api/v1/workouts` | Listar mis entrenamientos | Usuario/Admin | ✅ |
| POST | `/api/v1/workouts` | Crear entrenamiento | Usuario/Admin | ❌ |
| GET | `/api/v1/workouts/:id` | Ver entrenamiento | Usuario/Admin | ❌ |
| PUT | `/api/v1/workouts/:id` | Actualizar entrenamiento | Usuario/Admin | ❌ |
| DELETE | `/api/v1/workouts/:id` | Eliminar entrenamiento | Usuario/Admin | ❌ |
| **Administración** |
| GET | `/api/v1/admin/users` | Listar todos los usuarios | **Solo Admin** | ❌ |
| GET | `/api/v1/admin/users/:id` | Ver usuario específico | **Solo Admin** | ❌ |
| DELETE | `/api/v1/admin/users/:id` | Eliminar usuario | **Solo Admin** | ❌ |
| GET | `/api/v1/admin/stats` | Estadísticas del sistema | **Solo Admin** | ❌ |
| **Otros** |
| GET | `/health` | Health check | Público | ❌ |

### Ejemplos de Uso

#### 1. Registro y Login
```bash
# Registrarse
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@example.com",
    "name": "Juan Pérez",
    "password": "Password123",
    "weight": 70,
    "height": 175,
    "age": 25
  }'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@example.com",
    "password": "Password123"
  }'
```

#### 2. Crear Comida (requiere token)
```bash
curl -X POST http://localhost:3000/api/v1/entries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <tu_token>" \
  -d '{
    "date": "2025-12-03",
    "mealType": "breakfast",
    "foods": [
      {
        "name": "Avena",
        "calories": 150,
        "protein": 5,
        "carbs": 27,
        "fat": 3,
        "quantity": 50
      }
    ]
  }'
```

#### 3. Admin: Listar Usuarios (requiere rol admin)
```bash
curl -X GET http://localhost:3000/api/v1/admin/users \
  -H "Authorization: Bearer <admin_token>"
```

#### 4. Verificar Caché de Redis
```bash
# Primera llamada (X-Cache: MISS)
curl -i -X GET http://localhost:3000/api/v1/entries \
  -H "Authorization: Bearer <tu_token>"

# Segunda llamada (X-Cache: HIT)
curl -i -X GET http://localhost:3000/api/v1/entries \
  -H "Authorization: Bearer <tu_token>"
```

### Health Check

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-03T15:30:00.000Z",
  "services": {
    "mongodb": "connected",
    "redis": "connected"
  }
}
```

---

## Funcionalidades Implementadas

### MVP (Mínimo Producto Viable)

✅ **Autenticación y Autorización:**
- Registro de usuarios con validación
- Login con JWT
- Refresh tokens
- Protección de rutas con middleware

✅ **Gestión de Comidas (Entries):**
- CRUD completo
- Cálculo automático de totales de macros
- Filtrado por fecha
- Estadísticas diarias

✅ **Gestión de Entrenamientos (Workouts):**
- CRUD completo
- Múltiples ejercicios por entrenamiento
- Filtrado por fecha

✅ **Cache con Redis:**
- Cache de listados de entries
- Cache de listados de workouts
- Invalidación automática al modificar datos
- Header `X-Cache: HIT/MISS` para debugging

✅ **Docker:**
- Dockerfile optimizado (multi-stage build)
- Docker Compose con 3 servicios
- Health checks automáticos
- Volúmenes persistentes para MongoDB

---

## Roles y Permisos

El sistema implementa dos roles de usuario:

### 1. Usuario (`usuario`)
- **Asignado automáticamente** al registrarse
- Crear, leer, actualizar y eliminar **sus propias** comidas
- Crear, leer, actualizar y eliminar **sus propios** entrenamientos
- Ver **sus propias** estadísticas nutricionales
- Actualizar su perfil personal
- **NO puede** acceder a datos de otros usuarios
- **NO puede** acceder a endpoints de administración

### 2. Administrador (`admin`)
- **Todas las funciones** de usuario
- **Ver listado completo** de todos los usuarios del sistema
- **Eliminar** otros usuarios (excepto a sí mismo)
- **Ver estadísticas globales** del sistema (total de usuarios, admins, etc.)
- **Acceso completo** a endpoints `/api/v1/admin/*`

### Tabla de Permisos

| Acción | Usuario | Admin |
|--------|---------|-------|
| Registrarse e iniciar sesión | ✅ | ✅ |
| Ver/editar su propio perfil | ✅ | ✅ |
| CRUD de sus propias comidas | ✅ | ✅ |
| CRUD de sus propios entrenamientos | ✅ | ✅ |
| Ver estadísticas propias | ✅ | ✅ |
| **GET /admin/users** (listar todos los usuarios) | ❌ | ✅ |
| **DELETE /admin/users/:id** (eliminar usuarios) | ❌ | ✅ |
| **GET /admin/stats** (estadísticas del sistema) | ❌ | ✅ |

### Crear Usuario Admin

Para crear un usuario con rol `admin`, usa el script de seed:

```bash
docker exec gordont-api node src/scripts/seedAdmin.js
```

O manualmente en la base de datos MongoDB, modificando el campo `role` a `'admin'`.

---

## Seguridad Implementada

1. **Passwords hasheados** con bcrypt (10 salt rounds)
2. **JWT** para autenticación stateless
3. **Validación de entrada** con Express Validator
4. **Sanitización** contra inyección NoSQL
5. **Headers seguros** con Helmet
6. **CORS** configurado
7. **Rate limiting:** 100 req/15min (general), 5 req/15min (auth)

---

## Pruebas

Para ejecutar los tests:

```bash
npm test
```

**Cobertura de tests:**
- Tests unitarios para validadores
- Tests de integración para endpoints
- Tests de autenticación
- Tests de CRUD

---

## Comandos Útiles

**Iniciar servicios:**
```bash
docker compose up -d
```

**Ver logs:**
```bash
docker compose logs -f api
```

**Detener servicios:**
```bash
docker compose down
```

**Reiniciar todo:**
```bash
docker compose down -v
docker compose up --build
```

**Acceder a MongoDB:**
```bash
docker exec -it gordont-mongodb mongosh gordont
```

**Acceder a Redis:**
```bash
docker exec -it gordont-redis redis-cli
```

---

## Estructura del Proyecto

```
DDWGordont/
├── src/
│   ├── application/          # Casos de uso y servicios
│   ├── domain/               # Entidades y repositorios
│   ├── infrastructure/       # MongoDB, Redis, persistencia
│   ├── presentation/         # Controllers, routes, middleware
│   ├── shared/               # Utilidades compartidas
│   ├── config/               # Configuración
│   ├── swagger/              # Documentación API
│   ├── app.js                # Configuración de Express
│   └── index.js              # Punto de entrada
├── __tests__/                # Tests
├── docker-compose.yml        # Configuración Docker Compose
├── Dockerfile                # Imagen Docker
├── package.json              # Dependencias
├── .env                      # Variables de entorno (crear)
└── README.md                 # Este archivo
```

---

## Documentación Adicional

- **Swagger UI:** http://localhost:3000/api-docs (documentación interactiva completa)
- **DISENO.md:** Diseño funcional y técnico detallado con diagramas

---

## Soporte

Para problemas o dudas:
- Email: Matias.mcintire@gmail.com
- Email: Alfredo.juan.san@gmail.com

---

## Licencia

MIT License - Proyecto académico
