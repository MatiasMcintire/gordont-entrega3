# Requerimientos del Sistema - Gordont API

**Proyecto:** Sistema de Gestión Nutricional y Deportiva
**Cliente:** Usuarios que desean llevar control de su alimentación y ejercicio
**Fecha:** Noviembre 2025
**Versión:** 1.0

---

## 1. Descripción del Cliente y Problema Principal

**Cliente:** Personas interesadas en fitness y nutrición que necesitan una herramienta para llevar registro de sus hábitos alimenticios y deportivos.

**Problema Principal:**
Actualmente, muchas personas que desean mejorar su salud y condición física tienen dificultades para:
- Llevar un registro consistente de sus comidas y macronutrientes
- Monitorear su actividad física y entrenamientos
- Visualizar su progreso a lo largo del tiempo
- Calcular automáticamente sus macros diarios
- Tener toda esta información centralizada y accesible

**Solución Propuesta:**
Una API RESTful que permita a los usuarios registrar sus comidas con información nutricional detallada, registrar sus entrenamientos, y obtener estadísticas de su progreso. El sistema calculará automáticamente los totales de macronutrientes y permitirá consultas por fecha.

---

## 2. Lista de Usuarios del Sistema

1. **Usuario Registrado (Autenticado)**
   - Persona que se registra en el sistema con sus datos personales
   - Usa el sistema para llevar control diario de alimentación y ejercicio
   - Consulta sus propias estadísticas y progreso

2. **Administrador del Sistema** (Funcionalidad futura)
   - Gestiona usuarios del sistema
   - Ve estadísticas globales
   - Administra configuración del sistema

---

## 3. Tipos de Usuarios y Perfiles (Roles)

### 3.1 Usuario Autenticado (Default)

**Descripción:** Usuario estándar registrado en el sistema

**Permisos:**
- ✅ Registrarse en el sistema
- ✅ Iniciar sesión y obtener token JWT
- ✅ Ver y actualizar su propio perfil
- ✅ Crear, leer, actualizar y eliminar sus propias comidas (entries)
- ✅ Crear, leer, actualizar y eliminar sus propios entrenamientos (workouts)
- ✅ Consultar sus propias estadísticas nutricionales
- ✅ Filtrar sus registros por fecha
- ❌ Ver o modificar datos de otros usuarios
- ❌ Acceder a funciones administrativas

**Datos Personales:**
- Email (único, usado para login)
- Nombre completo
- Peso (kg)
- Altura (cm)
- Edad (años)

### 3.2 Administrador (Futuro)

**Descripción:** Usuario con privilegios administrativos

**Permisos:**
- ✅ Todos los permisos de Usuario Autenticado
- ✅ Ver listado de todos los usuarios
- ✅ Eliminar usuarios
- ✅ Ver estadísticas globales del sistema
- ✅ Gestionar configuración del sistema

---

## 4. Funciones Indispensables por Perfil

### Usuario Autenticado

**Prioridad Alta (MVP):**
1. **Autenticación**
   - Registrarse con email y password
   - Iniciar sesión con credenciales
   - Obtener token JWT para sesiones
   - Ver perfil personal

2. **Gestión de Comidas**
   - Registrar comida con fecha, tipo de comida y alimentos
   - Ingresar macronutrientes de cada alimento (calorías, proteínas, carbohidratos, grasas)
   - Ver listado de comidas por fecha
   - Editar comidas existentes
   - Eliminar comidas

3. **Gestión de Entrenamientos**
   - Registrar entrenamiento con fecha, tipo y ejercicios
   - Ingresar detalles de ejercicios (sets, reps, peso)
   - Ver listado de entrenamientos por fecha
   - Editar entrenamientos existentes
   - Eliminar entrenamientos

4. **Estadísticas**
   - Ver totales diarios de macronutrientes
   - Ver resumen de calorías consumidas vs quemadas

**Prioridad Media (Post-MVP):**
- Definir metas nutricionales personales
- Gráficos de progreso semanal/mensual
- Exportar datos a PDF/Excel
- Notificaciones de recordatorios

**Prioridad Baja (Futuro):**
- Compartir progreso en redes sociales
- Recetas recomendadas
- Integración con dispositivos wearables

### Administrador (Futuro)

**Prioridad Alta:**
- Dashboard administrativo
- Gestión de usuarios
- Estadísticas del sistema

---

## 5. Datos Básicos a Almacenar

### 5.1 Entidades Principales

#### Usuario (User)
- ID único
- Email (único)
- Nombre
- Password hasheado
- Peso (kg)
- Altura (cm)
- Edad (años)
- Fecha de creación
- Fecha de última actualización

#### Entrada/Comida (Entry)
- ID único
- ID de usuario (referencia)
- Fecha
- Tipo de comida (desayuno, almuerzo, cena, snack)
- Lista de alimentos
  - Nombre del alimento
  - Calorías
  - Proteínas (g)
  - Carbohidratos (g)
  - Grasas (g)
  - Cantidad (g)
- Notas opcionales
- Total de calorías (calculado)
- Total de proteínas (calculado)
- Total de carbohidratos (calculado)
- Total de grasas (calculado)
- Fecha de creación
- Fecha de última actualización

#### Entrenamiento (Workout)
- ID único
- ID de usuario (referencia)
- Fecha
- Tipo de entrenamiento (fuerza, cardio, flexibilidad, deportes, otro)
- Lista de ejercicios
  - Nombre del ejercicio
  - Sets/Series
  - Repeticiones
  - Peso (kg) [opcional]
  - Duración (segundos) [opcional]
  - Notas
- Duración total (minutos)
- Calorías quemadas estimadas
- Notas generales
- Fecha de creación
- Fecha de última actualización

---

## 6. Lista de Requisitos Funcionales

### RF-001: Registro de Usuario
**Descripción:** El sistema debe permitir a nuevos usuarios crear una cuenta.
**Prioridad:** Alta
**Entradas:** Email, nombre, password, peso, altura, edad
**Salidas:** Confirmación de registro exitoso + token JWT
**Validaciones:**
- Email único y formato válido
- Password mínimo 8 caracteres con mayúsculas, minúsculas y números
- Peso entre 1-500 kg
- Altura entre 50-300 cm
- Edad entre 13-120 años

### RF-002: Inicio de Sesión
**Descripción:** El sistema debe autenticar usuarios registrados.
**Prioridad:** Alta
**Entradas:** Email y password
**Salidas:** Token JWT + datos del usuario
**Validaciones:**
- Credenciales válidas
- Usuario existente en BD

### RF-003: Gestión de Perfil
**Descripción:** El usuario debe poder ver y actualizar su información personal.
**Prioridad:** Media
**Entradas:** Datos actualizados (nombre, peso, altura, edad)
**Salidas:** Perfil actualizado
**Validaciones:**
- Usuario autenticado
- Datos válidos según RF-001

### RF-004: Registro de Comida
**Descripción:** El usuario debe poder registrar sus comidas con información nutricional.
**Prioridad:** Alta
**Entradas:** Fecha, tipo de comida, lista de alimentos con macros
**Salidas:** Comida registrada con totales calculados
**Procesamiento:**
- Calcular automáticamente totales de calorías, proteínas, carbohidratos y grasas
- Invalidar cache de estadísticas
**Validaciones:**
- Usuario autenticado
- Fecha válida
- Tipo de comida válido
- Al menos un alimento en la lista
- Macros no negativos

### RF-005: Consulta de Comidas
**Descripción:** El usuario debe poder consultar sus comidas registradas.
**Prioridad:** Alta
**Entradas:** Fecha (opcional)
**Salidas:** Lista de comidas
**Filtros:**
- Por fecha específica
- Solo comidas del usuario autenticado

### RF-006: Actualización de Comida
**Descripción:** El usuario debe poder modificar comidas existentes.
**Prioridad:** Media
**Entradas:** ID de comida, datos actualizados
**Salidas:** Comida actualizada
**Validaciones:**
- Usuario es dueño de la comida
- Datos válidos según RF-004

### RF-007: Eliminación de Comida
**Descripción:** El usuario debe poder eliminar comidas.
**Prioridad:** Media
**Entradas:** ID de comida
**Salidas:** Confirmación de eliminación
**Validaciones:**
- Usuario es dueño de la comida

### RF-008: Cálculo de Estadísticas Diarias
**Descripción:** El sistema debe calcular totales diarios de macronutrientes.
**Prioridad:** Alta
**Entradas:** Fecha
**Salidas:** Totales de calorías, proteínas, carbohidratos, grasas por tipo de comida y total del día
**Procesamiento:**
- Sumar todos los macros de todas las comidas del día
- Agrupar por tipo de comida

### RF-009: Registro de Entrenamiento
**Descripción:** El usuario debe poder registrar entrenamientos.
**Prioridad:** Alta
**Entradas:** Fecha, tipo, ejercicios con detalles, duración, calorías quemadas
**Salidas:** Entrenamiento registrado
**Validaciones:**
- Usuario autenticado
- Al menos un ejercicio
- Duración > 0
- Calorías no negativas

### RF-010: Consulta de Entrenamientos
**Descripción:** El usuario debe poder consultar sus entrenamientos.
**Prioridad:** Alta
**Entradas:** Fecha (opcional)
**Salidas:** Lista de entrenamientos
**Filtros:**
- Por fecha específica
- Solo entrenamientos del usuario autenticado

### RF-011: Actualización de Entrenamiento
**Descripción:** El usuario debe poder modificar entrenamientos existentes.
**Prioridad:** Media
**Entradas:** ID de entrenamiento, datos actualizados
**Salidas:** Entrenamiento actualizado
**Validaciones:**
- Usuario es dueño del entrenamiento
- Datos válidos según RF-009

### RF-012: Eliminación de Entrenamiento
**Descripción:** El usuario debe poder eliminar entrenamientos.
**Prioridad:** Media
**Entradas:** ID de entrenamiento
**Salidas:** Confirmación de eliminación
**Validaciones:**
- Usuario es dueño del entrenamiento

### RF-013: Cache de Consultas
**Descripción:** El sistema debe cachear consultas frecuentes para mejorar rendimiento.
**Prioridad:** Media
**Procesamiento:**
- Cachear listados de entries por usuario y fecha
- Cachear listados de workouts por usuario y fecha
- Invalidar cache al crear/actualizar/eliminar
**Salidas:** Header X-Cache: HIT/MISS

---

## 7. Lista de Requisitos No Funcionales

### RNF-001: Seguridad - Autenticación
**Descripción:** El sistema debe usar JWT para autenticación stateless
**Criterio:** Tokens con expiración de 1 hora (access) y 7 días (refresh)
**Prioridad:** Alta

### RNF-002: Seguridad - Passwords
**Descripción:** Las contraseñas deben estar hasheadas
**Criterio:** Usar bcrypt con 10 salt rounds, nunca almacenar en texto plano
**Prioridad:** Alta

### RNF-003: Seguridad - Validación
**Descripción:** Todas las entradas deben ser validadas
**Criterio:** Usar Express Validator y Joi, sanitizar contra NoSQL injection
**Prioridad:** Alta

### RNF-004: Seguridad - Rate Limiting
**Descripción:** Limitar número de requests para prevenir abuso
**Criterio:** 100 req/15min general, 5 req/15min para endpoints de auth
**Prioridad:** Media

### RNF-005: Rendimiento - Tiempo de Respuesta
**Descripción:** El sistema debe responder rápidamente
**Criterio:** < 200ms para endpoints con cache, < 500ms sin cache
**Prioridad:** Media

### RNF-006: Rendimiento - Cache
**Descripción:** Usar cache para reducir carga en base de datos
**Criterio:** Redis con TTL de 5 minutos, invalidación automática
**Prioridad:** Media

### RNF-007: Disponibilidad
**Descripción:** El sistema debe estar disponible
**Criterio:** Health checks cada 30 segundos, auto-restart en fallos
**Prioridad:** Alta

### RNF-008: Escalabilidad - Base de Datos
**Descripción:** La BD debe soportar crecimiento de usuarios
**Criterio:** Índices en queries frecuentes (userId + date)
**Prioridad:** Media

### RNF-009: Escalabilidad - Capacidad
**Descripción:** El sistema debe soportar múltiples usuarios concurrentes
**Criterio:** 100-1000 usuarios concurrentes con configuración actual
**Prioridad:** Media

### RNF-010: Usabilidad - API RESTful
**Descripción:** La API debe seguir principios REST
**Criterio:** Verbos HTTP correctos, códigos de estado apropiados, respuestas JSON consistentes
**Prioridad:** Alta

### RNF-011: Usabilidad - Documentación
**Descripción:** La API debe estar documentada
**Criterio:** Swagger UI accesible en /api-docs con todos los endpoints documentados
**Prioridad:** Alta

### RNF-012: Mantenibilidad - Arquitectura
**Descripción:** El código debe estar bien organizado
**Criterio:** Arquitectura en capas (presentation, application, domain, infrastructure)
**Prioridad:** Media

### RNF-013: Portabilidad - Containerización
**Descripción:** La aplicación debe ser fácil de desplegar
**Criterio:** Docker Compose con un solo comando para levantar todos los servicios
**Prioridad:** Alta

### RNF-014: Compatibilidad
**Descripción:** Compatibilidad con navegadores modernos
**Criterio:** CORS habilitado, headers apropiados
**Prioridad:** Media

---

## 8. Definición del MVP (Minimum Viable Product)

### 8.1 Qué INCLUYE el MVP

**Funcionalidades Core:**
✅ Registro e inicio de sesión con JWT
✅ Gestión completa de comidas (CRUD)
✅ Cálculo automático de macronutrientes
✅ Gestión completa de entrenamientos (CRUD)
✅ Estadísticas diarias de nutrición
✅ Consultas filtradas por fecha
✅ Cache con Redis
✅ Validación de datos
✅ Documentación Swagger
✅ Docker Compose para despliegue

**Roles:**
✅ Usuario Autenticado (único rol en MVP)

**Tecnologías:**
✅ Node.js + Express
✅ MongoDB con Mongoose
✅ Redis para cache
✅ JWT para auth
✅ Docker + Docker Compose

**Endpoints Mínimos:**
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- GET /api/v1/auth/me
- GET /api/v1/entries
- POST /api/v1/entries
- GET /api/v1/entries/:id
- PUT /api/v1/entries/:id
- DELETE /api/v1/entries/:id
- GET /api/v1/entries/stats/daily
- GET /api/v1/workouts
- POST /api/v1/workouts
- GET /api/v1/workouts/:id
- PUT /api/v1/workouts/:id
- DELETE /api/v1/workouts/:id
- GET /health

### 8.2 Qué QUEDA para Futuras Versiones

**v2.0 - Funcionalidades Avanzadas:**
❌ Rol de Administrador
❌ Metas nutricionales personalizadas
❌ Notificaciones y recordatorios
❌ Gráficos de progreso (semanal, mensual, anual)
❌ Exportación de datos (PDF, Excel)
❌ Búsqueda de alimentos en base de datos nutricional
❌ Calculadora automática de macros según objetivos
❌ Planes de entrenamiento predefinidos

**v3.0 - Social y Gamificación:**
❌ Compartir progreso en redes sociales
❌ Comunidad de usuarios
❌ Sistema de logros y badges
❌ Desafíos entre usuarios
❌ Recetas compartidas

**v4.0 - Integraciones:**
❌ Integración con wearables (Fitbit, Apple Watch, Garmin)
❌ API pública para apps de terceros
❌ Integración con apps de recetas
❌ Sincronización con MyFitnessPal, Cronometer

---

## 9. Criterios de Aceptación del MVP

### Criterio 1: Autenticación Funcional
- ✅ Usuario puede registrarse con datos válidos
- ✅ Sistema valida formato de email y fortaleza de password
- ✅ Password se almacena hasheado en BD
- ✅ Usuario puede hacer login con credenciales correctas
- ✅ Sistema retorna JWT válido
- ✅ JWT permite acceso a endpoints protegidos
- ✅ JWT inválido retorna 401 Unauthorized

### Criterio 2: Gestión de Comidas
- ✅ Usuario autenticado puede crear comida con múltiples alimentos
- ✅ Sistema calcula automáticamente totales de macros
- ✅ Usuario puede consultar sus comidas por fecha
- ✅ Usuario puede actualizar comida existente
- ✅ Usuario puede eliminar comida
- ✅ Usuario NO puede ver/editar comidas de otros usuarios

### Criterio 3: Gestión de Entrenamientos
- ✅ Usuario autenticado puede crear entrenamiento con múltiples ejercicios
- ✅ Usuario puede consultar sus entrenamientos por fecha
- ✅ Usuario puede actualizar entrenamiento existente
- ✅ Usuario puede eliminar entrenamiento
- ✅ Usuario NO puede ver/editar entrenamientos de otros usuarios

### Criterio 4: Estadísticas
- ✅ Endpoint de estadísticas retorna totales correctos
- ✅ Totales agrupados por tipo de comida
- ✅ Total general del día calculado correctamente

### Criterio 5: Cache
- ✅ Segunda consulta idéntica retorna desde cache (header X-Cache: HIT)
- ✅ Cache se invalida al crear/actualizar/eliminar
- ✅ Sistema funciona sin Redis (degradación graceful)

### Criterio 6: Docker
- ✅ `docker compose up --build` levanta todos los servicios
- ✅ API accesible en http://localhost:3000
- ✅ MongoDB y Redis funcionando
- ✅ Health check retorna estado correcto

### Criterio 7: Documentación
- ✅ Swagger UI accesible en /api-docs
- ✅ Todos los endpoints documentados
- ✅ README con instrucciones de ejecución
- ✅ Ejemplos de request/response

---

## 10. Riesgos y Mitigaciones

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|--------------|------------|
| Pérdida de datos por fallo de MongoDB | Alto | Baja | Backups automáticos, volúmenes persistentes en Docker |
| Tokens JWT comprometidos | Alto | Media | Expiración corta (1h), refresh tokens, HTTPS en producción |
| Sobrecarga del servidor | Medio | Media | Rate limiting, cache con Redis, índices en BD |
| Redis no disponible | Bajo | Media | Fallback a modo sin cache, sistema sigue funcionando |
| Validación insuficiente | Alto | Baja | Express Validator + Joi, sanitización, tests exhaustivos |
| Escalabilidad limitada | Medio | Media | Diseño preparado para horizontal scaling futuro |

---

**Última actualización:** 19 de Noviembre 2025
**Estado:** Aprobado
**Próxima revisión:** Al finalizar MVP
