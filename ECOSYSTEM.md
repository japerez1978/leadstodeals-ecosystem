# 🌐 LeadsToDeals: El Ecosistema SaaS Industrial

Este documento describe la visión, arquitectura y componentes del ecosistema de aplicaciones SaaS multitenant diseñado para digitalizar y optimizar procesos comerciales y operativos en PYMES industriales.

---

## 🎯 Visión del Proyecto
Construir una plataforma unificada y modular que permita a empresas industriales gestionar todo su ciclo de negocio — desde el scoring de leads hasta la gestión de ofertas y servicios técnicos — bajo una infraestructura **multitenant** escalable, con una experiencia de usuario (UX) premium y automatizaciones inteligentes.

---

## 🏗️ Arquitectura Monorepositorio
El ecosistema está organizado como un **monorepo**, lo que permite compartir lógica, estilos y componentes entre diferentes aplicaciones bajo una misma base de código.

### Estructura de Proyectos:
*   **`core-saas`**: El corazón del ecosistema. Contiene el sistema de diseño (Glassmorphism), componentes UI compartidos, utilidades de autenticación y hooks globales.
*   **`leadstodeals-scoring`**: Sistema de puntuación algorítmica de oportunidades comerciales conectado a HubSpot.
*   **`sats-saltoki`**: Aplicación para la gestión de Servicios de Asistencia Técnica (SATs).
*   **`leadstodeals-admin`**: Panel de control global para la gestión de tenants, usuarios y permisos.
*   **`intranox-ofertas`**: Generador inteligente de ofertas y presupuestos.

---

## 🔒 Estrategia Multitenant
La arquitectura se basa en el principio de **aislamiento de datos en base de datos única** utilizando **Supabase**:

1.  **Identidad de Tenant**: Cada registro en la base de datos está vinculado a un `tenant_id`.
2.  **Row Level Security (RLS)**: Las políticas de Supabase aseguran que un usuario solo pueda ver y modificar los datos que pertenecen a su tenant. No se comparte información entre clientes.
3.  **Personalización por Tenant**: Aunque el código es compartido, las matrices de scoring, plantillas de ofertas y configuraciones son específicas para cada empresa.

---

## 🛠️ Stack Tecnológico Unificado
Para garantizar la velocidad de desarrollo y la consistencia, todas las apps comparten el mismo stack:

| Capa | Tecnología |
| :--- | :--- |
| **Frontend** | React 19 + Vite |
| **Estilos** | Tailwind CSS v4 + Material Symbols |
| **Backend** | Supabase (PostgreSQL + RLS) |
| **Autenticación** | Supabase Auth (SAML/OAuth preparados) |
| **Integración CRM** | HubSpot API (vía Proxy dedicado) |
| **Despliegue** | Netlify (Monorepo Build Pipelines) |

---

## 🎨 Principios de Diseño (UX/UI)
El ecosistema no solo busca funcionalidad, sino excelencia visual:
*   **Glassmorphism**: Uso de transparencias, desenfoques y gradientes para una estética moderna y profesional.
*   **Interactividad**: Animaciones sutiles y feedback inmediato mediante hooks de `@tanstack/react-query`.
*   **Responsive First**: Diseñado para ser usado tanto en fábricas/campo como en oficinas comerciales.

---

## 🚀 Hoja de Ruta del Ecosistema

### Fase 1: Estabilización (Actual)
*   [x] Migración a estructura de monorepositorio.
*   [x] Unificación del sistema de login y contextos de autenticación.
*   [x] Despliegue automatizado en Netlify por proyecto.

### Fase 2: Inteligencia y Automatización
*   [ ] Integración de Agentes de IA para análisis de ofertas.
*   [ ] Sincronización bidireccional avanzada con HubSpot.
*   [ ] Dashboard analítico global de KPIs industriales.

### Fase 3: Escala e Integraciones
*   [ ] Módulo de firma digital integrada.
*   [ ] Integración con ERPs industriales (SAP, Microsoft Dynamics).
*   [ ] Aplicación móvil nativa para técnicos de campo (SAT).

---

> [!TIP]
> **Filosofía de desarrollo**: "Construir una vez, desplegar para muchos". Cada nueva funcionalidad en `core-saas` beneficia inmediatamente a todo el ecosistema.
