# API Documentation - Gordont

**Versión:** 1.0.0
**Base URL:** `http://localhost:3000/api/v1`
**Documentación Interactiva:** http://localhost:3000/api-docs (Swagger UI)

---

## Tabla de Contenidos

1. [Autenticación](#autenticación)
2. [Roles y Permisos](#roles-y-permisos)
3. [Endpoints de Autenticación](#endpoints-de-autenticación)
4. [Endpoints de Entries (Comidas)](#endpoints-de-entries-comidas)
5. [Endpoints de Workouts (Entrenamientos)](#endpoints-de-workouts-entrenamientos)
6. [Endpoints de Administración](#endpoints-de-administración)
7. [Health Check](#health-check)
8. [Códigos de Error](#códigos-de-error)
9. [Ejemplos de Uso](#ejemplos-de-uso)

---

## Autenticación

La API utiliza **JSON Web Tokens (JWT)** para autenticación.

### Obtener un Token

1. **Registrarse:** `POST /api/v1/auth/register`
2. **Iniciar sesión:** `POST /api/v1/auth/login`

Ambos endpoints retornan un `accessToken` que debe incluirse en las solicitudes protegidas.

### Usar el Token

Incluir el token en el header `Authorization`:

```
Authorization: Bearer <tu_token_jwt>
```

### Expiración

- **Access Token:** 24 horas
- **Refresh Token:** 7 días

---

## Roles y Permisos

### Roles Disponibles

| Rol | Descripción |
|-----|-------------|
| `usuario` | Usuario estándar (asignado por defecto al registrarse) |
| `admin` | Administrador del sistema con permisos especiales |

### Permisos por Rol

| Acción | Usuario | Admin |
|--------|---------|-------|
| Registrarse e iniciar sesión | ✅ | ✅ |
| Ver y editar su propio perfil | ✅ | ✅ |
| Crear/editar/eliminar sus propias comidas | ✅ | ✅ |
| Crear/editar/eliminar sus propios entrenamientos | ✅ | ✅ |
| Ver estadísticas propias | ✅ | ✅ |
| Listar todos los usuarios | ❌ | ✅ |
| Eliminar otros usuarios | ❌ | ✅ |
| Ver estadísticas del sistema | ❌ | ✅ |

---

## Endpoints de Autenticación

### POST /auth/register

Registrar un nuevo usuario en el sistema.

**Rol requerido:** Ninguno (público)

**Request Body:**
```json
{
  "email": "usuario@example.com",
  "name": "Juan Pérez",
  "password": "Password123",
  "weight": 70,
  "height": 175,
  "age": 25
}
```

**Validaciones:**
- `email`: Formato válido, único en el sistema
- `name`: 2-50 caracteres
- `password`: Mínimo 8 caracteres, debe contener mayúscula, minúscula y número
- `weight`: 1-500 kg
- `height`: 50-300 cm
- `age`: 13-120 años

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "6472a8f9c1d2e3f4a5b6c7d8",
      "email": "usuario@example.com",
      "name": "Juan Pérez",
      "weight": 70,
      "height": 175,
      "age": 25,
      "role": "usuario",
      "bmi": 22.86,
      "createdAt": "2025-12-03T10:30:00.000Z",
      "updatedAt": "2025-12-03T10:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errores:**
- `400 Bad Request`: Datos de validación incorrectos
- `409 Conflict`: El email ya está registrado

---

### POST /auth/login

Iniciar sesión con credenciales.

**Rol requerido:** Ninguno (público)

**Request Body:**
```json
{
  "email": "usuario@example.com",
  "password": "Password123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "6472a8f9c1d2e3f4a5b6c7d8",
      "email": "usuario@example.com",
      "name": "Juan Pérez",
      "weight": 70,
      "height": 175,
      "age": 25,
      "role": "usuario",
      "bmi": 22.86,
      "createdAt": "2025-12-03T10:30:00.000Z",
      "updatedAt": "2025-12-03T10:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errores:**
- `400 Bad Request`: Faltan credenciales
- `401 Unauthorized`: Credenciales inválidas

---

### GET /auth/me

Obtener información del usuario autenticado.

**Rol requerido:** Cualquiera (autenticado)

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "6472a8f9c1d2e3f4a5b6c7d8",
    "email": "usuario@example.com",
    "name": "Juan Pérez",
    "weight": 70,
    "height": 175,
    "age": 25,
    "role": "usuario",
    "bmi": 22.86,
    "createdAt": "2025-12-03T10:30:00.000Z",
    "updatedAt": "2025-12-03T10:30:00.000Z"
  }
}
```

**Errores:**
- `401 Unauthorized`: Token inválido o expirado
- `404 Not Found`: Usuario no encontrado

---

## Endpoints de Entries (Comidas)

### GET /entries

Listar comidas del usuario autenticado.

**Rol requerido:** `usuario` o `admin`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `date` (opcional): Filtrar por fecha (formato: `YYYY-MM-DD`)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": "6472b1a2d3e4f5a6b7c8d9e0",
        "userId": "6472a8f9c1d2e3f4a5b6c7d8",
        "date": "2025-12-03T00:00:00.000Z",
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
        ],
        "notes": "Desayuno saludable",
        "totalCalories": 150,
        "totalProtein": 5,
        "totalCarbs": 27,
        "totalFat": 3,
        "createdAt": "2025-12-03T08:00:00.000Z",
        "updatedAt": "2025-12-03T08:00:00.000Z"
      }
    ]
  }
}
```

**Headers de respuesta:**
- `X-Cache: HIT` - Datos obtenidos desde caché Redis
- `X-Cache: MISS` - Datos obtenidos desde MongoDB

**Errores:**
- `401 Unauthorized`: Token inválido

---

### POST /entries

Crear una nueva comida.

**Rol requerido:** `usuario` o `admin`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "date": "2025-12-03",
  "mealType": "lunch",
  "foods": [
    {
      "name": "Pollo a la plancha",
      "calories": 250,
      "protein": 30,
      "carbs": 0,
      "fat": 12,
      "quantity": 150
    },
    {
      "name": "Arroz integral",
      "calories": 200,
      "protein": 5,
      "carbs": 45,
      "fat": 2,
      "quantity": 100
    }
  ],
  "notes": "Almuerzo post-entrenamiento"
}
```

**Validaciones:**
- `mealType`: `breakfast`, `lunch`, `dinner`, `snack`
- `foods`: Mínimo 1 alimento
- Macros no pueden ser negativos

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Entry created successfully",
  "data": {
    "entry": {
      "id": "6472b1a2d3e4f5a6b7c8d9e0",
      "userId": "6472a8f9c1d2e3f4a5b6c7d8",
      "date": "2025-12-03T00:00:00.000Z",
      "mealType": "lunch",
      "foods": [...],
      "totalCalories": 450,
      "totalProtein": 35,
      "totalCarbs": 45,
      "totalFat": 14,
      "createdAt": "2025-12-03T12:00:00.000Z",
      "updatedAt": "2025-12-03T12:00:00.000Z"
    }
  }
}
```

**Errores:**
- `400 Bad Request`: Datos de validación incorrectos
- `401 Unauthorized`: Token inválido

---

### GET /entries/:id

Obtener una comida específica.

**Rol requerido:** `usuario` o `admin` (solo puede ver sus propias comidas)

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`

**Errores:**
- `401 Unauthorized`: Token inválido
- `403 Forbidden`: Intentando acceder a comida de otro usuario
- `404 Not Found`: Comida no encontrada

---

### PUT /entries/:id

Actualizar una comida existente.

**Rol requerido:** `usuario` o `admin` (solo puede editar sus propias comidas)

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:** (igual que POST /entries)

**Response:** `200 OK`

**Errores:**
- `400 Bad Request`: Datos de validación incorrectos
- `401 Unauthorized`: Token inválido
- `403 Forbidden`: Intentando editar comida de otro usuario
- `404 Not Found`: Comida no encontrada

---

### DELETE /entries/:id

Eliminar una comida.

**Rol requerido:** `usuario` o `admin` (solo puede eliminar sus propias comidas)

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Entry deleted successfully"
}
```

**Errores:**
- `401 Unauthorized`: Token inválido
- `403 Forbidden`: Intentando eliminar comida de otro usuario
- `404 Not Found`: Comida no encontrada

---

### GET /entries/stats/daily

Obtener estadísticas diarias de nutrición.

**Rol requerido:** `usuario` o `admin`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `date` (opcional): Fecha a consultar (formato: `YYYY-MM-DD`, default: hoy)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "date": "2025-12-03",
    "totalCalories": 2100,
    "totalProtein": 150,
    "totalCarbs": 200,
    "totalFat": 70,
    "mealBreakdown": {
      "breakfast": {
        "calories": 450,
        "protein": 20,
        "carbs": 60,
        "fat": 15
      },
      "lunch": {
        "calories": 700,
        "protein": 50,
        "carbs": 80,
        "fat": 25
      },
      "dinner": {
        "calories": 650,
        "protein": 55,
        "carbs": 50,
        "fat": 20
      },
      "snack": {
        "calories": 300,
        "protein": 25,
        "carbs": 10,
        "fat": 10
      }
    }
  }
}
```

---

## Endpoints de Workouts (Entrenamientos)

Similar a Entries, los endpoints de workouts incluyen:

- `GET /workouts` - Listar entrenamientos
- `POST /workouts` - Crear entrenamiento
- `GET /workouts/:id` - Obtener entrenamiento específico
- `PUT /workouts/:id` - Actualizar entrenamiento
- `DELETE /workouts/:id` - Eliminar entrenamiento

Todos requieren autenticación y siguen el mismo patrón de ownership (usuarios solo acceden a sus propios datos).

---

## Endpoints de Administración

### GET /admin/users

Listar todos los usuarios del sistema.

**Rol requerido:** `admin` ⚠️

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Usuarios por página (default: 10)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "6472a8f9c1d2e3f4a5b6c7d8",
        "email": "usuario1@example.com",
        "name": "Usuario 1",
        "weight": 70,
        "height": 175,
        "age": 25,
        "role": "usuario",
        "bmi": 22.86,
        "createdAt": "2025-12-03T10:30:00.000Z",
        "updatedAt": "2025-12-03T10:30:00.000Z"
      },
      {
        "id": "6472a8f9c1d2e3f4a5b6c7d9",
        "email": "admin@gordont.com",
        "name": "Admin Gordont",
        "weight": 75,
        "height": 175,
        "age": 30,
        "role": "admin",
        "bmi": 24.49,
        "createdAt": "2025-12-02T10:00:00.000Z",
        "updatedAt": "2025-12-02T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

**Errores:**
- `401 Unauthorized`: Token inválido
- `403 Forbidden`: Usuario no tiene rol de admin

---

### GET /admin/users/:id

Obtener información completa de un usuario específico.

**Rol requerido:** `admin` ⚠️

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`

**Errores:**
- `401 Unauthorized`: Token inválido
- `403 Forbidden`: Usuario no tiene rol de admin
- `404 Not Found`: Usuario no encontrado

---

### DELETE /admin/users/:id

Eliminar un usuario del sistema.

**Rol requerido:** `admin` ⚠️

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": {
    "deletedUserId": "6472a8f9c1d2e3f4a5b6c7d8"
  }
}
```

**Errores:**
- `400 Bad Request`: Intentando eliminar su propia cuenta
- `401 Unauthorized`: Token inválido
- `403 Forbidden`: Usuario no tiene rol de admin
- `404 Not Found`: Usuario no encontrado

---

### GET /admin/stats

Obtener estadísticas generales del sistema.

**Rol requerido:** `admin` ⚠️

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 125,
      "admins": 2,
      "usuarios": 123
    },
    "timestamp": "2025-12-03T15:30:00.000Z"
  }
}
```

**Errores:**
- `401 Unauthorized`: Token inválido
- `403 Forbidden`: Usuario no tiene rol de admin

---

## Health Check

### GET /health

Verificar el estado de los servicios.

**Rol requerido:** Ninguno (público)

**Response:** `200 OK`
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

## Códigos de Error

| Código | Significado |
|--------|-------------|
| `200 OK` | Solicitud exitosa |
| `201 Created` | Recurso creado exitosamente |
| `400 Bad Request` | Datos de entrada inválidos |
| `401 Unauthorized` | Token faltante, inválido o expirado |
| `403 Forbidden` | Permisos insuficientes (rol incorrecto) |
| `404 Not Found` | Recurso no encontrado |
| `409 Conflict` | Conflicto (ej: email ya registrado) |
| `429 Too Many Requests` | Rate limit excedido |
| `500 Internal Server Error` | Error del servidor |

---

## Ejemplos de Uso

### Ejemplo 1: Registro y creación de comida

```bash
# 1. Registrarse
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

# Guardar el accessToken de la respuesta

# 2. Crear una comida
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

### Ejemplo 2: Login como admin y listar usuarios

```bash
# 1. Login como admin
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@gordont.com",
    "password": "Admin123!"
  }'

# 2. Listar todos los usuarios
curl -X GET "http://localhost:3000/api/v1/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer <admin_token>"
```

### Ejemplo 3: Verificar caché de Redis

```bash
# Primera llamada (MISS - no está en caché)
curl -X GET http://localhost:3000/api/v1/entries \
  -H "Authorization: Bearer <tu_token>" \
  -i | grep X-Cache
# Resultado: X-Cache: MISS

# Segunda llamada inmediata (HIT - está en caché)
curl -X GET http://localhost:3000/api/v1/entries \
  -H "Authorization: Bearer <tu_token>" \
  -i | grep X-Cache
# Resultado: X-Cache: HIT
```

---

## Rate Limiting

La API aplica límites de tasa para prevenir abuso:

- **General:** 100 requests / 15 minutos
- **Auth endpoints:** 5 requests / 15 minutos

Cuando se excede el límite, la API retorna `429 Too Many Requests`.

---

## Caché con Redis

Los siguientes endpoints usan caché de Redis:

- `GET /api/v1/entries`
- `GET /api/v1/workouts`

El caché se invalida automáticamente cuando se crean, actualizan o eliminan recursos.

**Headers de respuesta:**
- `X-Cache: HIT` - Datos desde caché (más rápido)
- `X-Cache: MISS` - Datos desde MongoDB

**TTL (Time To Live):** 5 minutos

---

**Documentación generada el:** 3 de Diciembre 2025
**Versión de la API:** 1.0.0
