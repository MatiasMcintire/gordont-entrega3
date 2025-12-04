# 📝 Instrucciones para Crear Repositorio en GitHub

**Fecha:** 3 de Diciembre 2025
**Responsable:** Matías McIntire

---

## 🎯 Paso 1: Crear Repositorio en GitHub

### Opción A: Desde la Web (MÁS FÁCIL)

1. **Ir a GitHub:**
   - Abre https://github.com
   - Inicia sesión con tu cuenta

2. **Crear Nuevo Repositorio:**
   - Click en el botón **"+"** (arriba derecha)
   - Selecciona **"New repository"**

3. **Configurar el Repositorio:**
   ```
   Repository name: gordont-entrega3

   Description:
   Sistema de Gestión Nutricional y Deportiva - API REST con JWT, Roles, MongoDB y Redis

   Visibility: ☑️ Public (o Private si prefieren)

   ⚠️ NO marcar:
   ❌ Add a README file
   ❌ Add .gitignore
   ❌ Choose a license

   (Ya tenemos estos archivos localmente)
   ```

4. **Click en "Create repository"**

5. **Copiar el URL del repo:**
   ```
   https://github.com/TU-USUARIO/gordont-entrega3.git
   ```

---

## 🚀 Paso 2: Conectar Repositorio Local con GitHub

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
# Verificar que estás en la carpeta correcta
pwd
# Debe mostrar: .../DDWGordont

# Agregar el remote (reemplaza TU-USUARIO con tu usuario de GitHub)
git remote add origin https://github.com/TU-USUARIO/gordont-entrega3.git

# Verificar que se agregó correctamente
git remote -v

# Push del código
git push -u origin main
```

**Ejemplo real:**
```bash
git remote add origin https://github.com/MatiasMcintire/gordont-entrega3.git
git push -u origin main
```

Si te pide autenticación:
- **Usuario:** Tu usuario de GitHub
- **Password:** Tu **Personal Access Token** (NO tu contraseña)

---

## 🔑 Crear Personal Access Token (si no tienes)

1. Ir a https://github.com/settings/tokens
2. Click en **"Generate new token"** → **"Generate new token (classic)"**
3. Configurar:
   - **Note:** "Gordont Entrega 3"
   - **Expiration:** 30 days
   - **Scopes:** Marcar **repo** (todos los sub-checkboxes)
4. Click en **"Generate token"**
5. **COPIAR EL TOKEN** (solo se muestra una vez)
6. Usar ese token como contraseña al hacer push

---

## 👥 Paso 3: Invitar a los Colaboradores

### En GitHub Web:

1. Ir al repositorio: `https://github.com/TU-USUARIO/gordont-entrega3`
2. Click en **"Settings"** (⚙️ arriba)
3. En el menú izquierdo, click en **"Collaborators and teams"**
4. Click en **"Add people"**
5. Buscar y agregar:
   - Leonardo Aguilera (su usuario de GitHub)
   - Alfredo Sanjuan (su usuario de GitHub)
   - Matías Morales (su usuario de GitHub)
6. Seleccionar rol: **"Write"** (para que puedan hacer push)
7. Enviar invitación

**⚠️ Importante:** Cada uno debe aceptar la invitación por email o en su perfil de GitHub.

---

## 📧 Paso 4: Compartir con el Equipo

**Enviar este mensaje al grupo de WhatsApp/Discord:**

```
🚀 REPO LISTO PARA ENTREGA 3

Repositorio: https://github.com/TU-USUARIO/gordont-entrega3

📋 INSTRUCCIONES PARA CLONAR:

1. Aceptar la invitación de colaborador (revisen su email)

2. Clonar el repo:
git clone https://github.com/TU-USUARIO/gordont-entrega3.git
cd gordont-entrega3

3. Instalar dependencias:
npm install

4. Copiar variables de entorno:
cp .env.example .env

5. Levantar con Docker:
docker compose up --build

6. Verificar que funciona:
curl http://localhost:3000/health

📚 LEER ANTES DE EMPEZAR:
- GUIA-COLABORACION.md (flujo de trabajo)
- REPARTO-TAREAS.md (tu tarea específica)

⚠️ IMPORTANTE:
- NO hacer commits directos a main
- Trabajar en tu branch feature/nombre
- Hacer Pull Request cuando termines

¿Dudas? Pregunten en el grupo 👍
```

---

## 🌿 Paso 5: Crear Branch de Desarrollo (develop)

```bash
# Crear branch develop
git checkout -b develop

# Push de develop
git push -u origin develop

# Volver a main
git checkout main
```

### Configurar Branch Principal en GitHub:

1. Ir a **Settings** → **Branches**
2. En "Default branch", cambiar de `main` a `develop`
3. Click en **Update**

Esto hace que los Pull Requests vayan a `develop` por defecto.

---

## 🔒 Paso 6: Proteger Branch main (Opcional pero Recomendado)

Para evitar commits directos a `main`:

1. Ir a **Settings** → **Branches**
2. Click en **"Add rule"**
3. Configurar:
   - **Branch name pattern:** `main`
   - ☑️ Require a pull request before merging
   - ☑️ Require approvals: 1
4. Click en **"Create"**

Ahora nadie podrá hacer push directo a `main`, solo via Pull Request.

---

## 📋 Checklist de Configuración

- [ ] Repositorio creado en GitHub
- [ ] Remote agregado localmente
- [ ] Push del código a main
- [ ] Branch develop creado y pusheado
- [ ] develop configurado como default branch
- [ ] Los 4 colaboradores invitados
- [ ] Todos aceptaron invitación
- [ ] Branch main protegida (opcional)
- [ ] Mensaje compartido en el grupo
- [ ] Cada uno clonó el repo exitosamente

---

## 🆘 Solución de Problemas

### Error: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/TU-USUARIO/gordont-entrega3.git
```

### Error: "failed to push some refs"
```bash
# Si es un repo nuevo y vacío, usar --force la primera vez
git push -u origin main --force
```

### Error: "authentication failed"
```bash
# Asegúrate de usar Personal Access Token, no tu contraseña
# Generar uno en: https://github.com/settings/tokens
```

### No puedo hacer push
```bash
# Verificar que tienes permisos
git remote -v

# Si eres colaborador, deberías poder push
# Si no, pide al dueño que te agregue con rol "Write"
```

---

## 📚 Recursos Útiles

- **Git Cheat Sheet:** https://education.github.com/git-cheat-sheet-education.pdf
- **GitHub Guides:** https://guides.github.com/
- **Pro Git Book:** https://git-scm.com/book/es/v2

---

## 🎓 Comandos Git Básicos de Referencia

```bash
# Ver estado
git status

# Ver branches
git branch -a

# Cambiar de branch
git checkout nombre-branch

# Crear nuevo branch
git checkout -b nuevo-branch

# Ver commits
git log --oneline

# Ver diferencias
git diff

# Agregar archivos
git add archivo.js
git add .

# Commit
git commit -m "mensaje"

# Push
git push

# Pull (traer cambios)
git pull

# Ver remotes
git remote -v
```

---

**¡Listo! Ahora el equipo puede empezar a trabajar de forma colaborativa 🎉**

---

**Última actualización:** 3 de Diciembre 2025
**Responsable:** Matías McIntire
