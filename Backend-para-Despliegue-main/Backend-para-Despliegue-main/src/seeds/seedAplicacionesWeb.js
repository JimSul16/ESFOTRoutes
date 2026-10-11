/**
 * Semilla Curricular: Desarrollo de Aplicaciones Web (ESFOT - EPN)
 */
export const webSubject = {
  id: 'web',
  name: 'Desarrollo de Aplicaciones Web',
  code: 'CS-WEB-302',
  description: 'Arquitectura de aplicaciones web, ciclo cliente-servidor HTTP/HTTPS, desarrollo frontend moderno con React, APIs RESTful con Node/Express, autenticación JWT y persistencia de datos.',
  credits: 4,
  modules: [
    {
      id: 'web-m1',
      name: 'Módulo 1: Fundamentos y Arquitectura Web',
      position: 1,
      description: 'Ecosistema de internet, ciclo petición-respuesta HTTP/HTTPS, HTML5 semántico y CSS3 responsivo.',
      topics: [
        {
          id: 'web-fundamentos',
          name: 'Arquitectura Cliente-Servidor y Protocolo HTTP',
          description: 'Métodos HTTP (GET, POST, PUT, DELETE), códigos de estado, cabeceras, DNS y resolución de dominios en la web.',
          difficulty: 'Principiante',
          estimatedMinutes: 50,
          resources: [
            { id: 'res-web-1', title: 'Fundamentos de la Web y Protocolo HTTP', url: 'https://esfot.epn.edu.ec/recursos/web/http-fundamentos.pdf', type: 'PDF' }
          ],
          prerequisites: [
            // Prerrequisito cruzado suave con Redes de Computadoras
            { targetId: 'redes-tcp-udp', strength: 'SOFT' }
          ]
        },
        {
          id: 'web-html-css',
          name: 'HTML5 Semántico y Estilos Modernos con CSS3',
          description: 'Estructuración accesible, Box Model, Flexbox, CSS Grid y diseño responsivo para móviles.',
          difficulty: 'Principiante',
          estimatedMinutes: 60,
          resources: [
            { id: 'res-web-2', title: 'Guía de Maquetación Responsiva con Flexbox y Grid', url: 'https://esfot.epn.edu.ec/recursos/web/html-css-grid.pdf', type: 'PDF' }
          ],
          prerequisites: [
            { targetId: 'web-fundamentos', strength: 'HARD' }
          ]
        }
      ]
    },
    {
      id: 'web-m2',
      name: 'Módulo 2: Frontend Dinámico y React',
      position: 2,
      description: 'Programación asíncrona con JavaScript, manipulación de DOM y desarrollo de SPAs con React.',
      topics: [
        {
          id: 'web-js-dom',
          name: 'JavaScript Moderno (ES6+) y el DOM',
          description: 'Arrow functions, desestructuración, promesas, async/await, eventos y consumo de APIs con Fetch.',
          difficulty: 'Intermedio',
          estimatedMinutes: 75,
          resources: [
            { id: 'res-web-3', title: 'Manual de JavaScript Asíncrono y Fetch API', url: 'https://esfot.epn.edu.ec/recursos/web/js-async.pdf', type: 'PDF' }
          ],
          prerequisites: [
            { targetId: 'web-html-css', strength: 'HARD' }
          ]
        },
        {
          id: 'web-react-intro',
          name: 'Fundamentos de React: Componentes y Estado',
          description: 'JSX, componentes funcionales, props, renderizado condicional y el hook useState.',
          difficulty: 'Intermedio',
          estimatedMinutes: 80,
          resources: [
            { id: 'res-web-4', title: 'Introducción al Modelo de Componentes en React', url: 'https://esfot.epn.edu.ec/recursos/web/react-intro.pdf', type: 'PDF' }
          ],
          prerequisites: [
            { targetId: 'web-js-dom', strength: 'HARD' }
          ]
        },
        {
          id: 'web-spa-routing',
          name: 'SPAs, Ciclo de Vida y Navegación (React Router)',
          description: 'Efectos con useEffect, enrutamiento del lado del cliente, rutas protegidas y estado global.',
          difficulty: 'Intermedio',
          estimatedMinutes: 70,
          resources: [
            { id: 'res-web-5', title: 'Arquitectura SPA con React Router y Hooks', url: 'https://esfot.epn.edu.ec/recursos/web/spa-routing.pdf', type: 'PDF' }
          ],
          prerequisites: [
            { targetId: 'web-react-intro', strength: 'HARD' }
          ]
        }
      ]
    },
    {
      id: 'web-m3',
      name: 'Módulo 3: Backend con Node.js y APIs RESTful',
      position: 3,
      description: 'Construcción de servidores Express, diseño de endpoints RESTful y mecanismos de autenticación segura.',
      topics: [
        {
          id: 'web-node-express',
          name: 'Servidores Web y APIs REST con Node.js y Express',
          description: 'Estructura MVC, middlewares, validación de esquemas, enrutamiento y manejo centralizado de errores.',
          difficulty: 'Intermedio',
          estimatedMinutes: 85,
          resources: [
            { id: 'res-web-6', title: 'Diseño de APIs RESTful con Express.js', url: 'https://esfot.epn.edu.ec/recursos/web/express-rest.pdf', type: 'PDF' }
          ],
          prerequisites: [
            { targetId: 'web-js-dom', strength: 'HARD' },
            { targetId: 'web-fundamentos', strength: 'HARD' }
          ]
        },
        {
          id: 'web-auth-jwt',
          name: 'Seguridad y Autenticación con JWT',
          description: 'Hash de contraseñas con bcrypt, generación y verificación de JWT, protección contra CSRF y XSS.',
          difficulty: 'Avanzado',
          estimatedMinutes: 80,
          resources: [
            { id: 'res-web-7', title: 'Seguridad Web y Autenticación Basada en Tokens', url: 'https://esfot.epn.edu.ec/recursos/web/auth-jwt.pdf', type: 'PDF' }
          ],
          prerequisites: [
            { targetId: 'web-node-express', strength: 'HARD' }
          ]
        }
      ]
    },
    {
      id: 'web-m4',
      name: 'Módulo 4: Persistencia y Despliegue',
      position: 4,
      description: 'Integración con bases de datos relacionales y estrategias de despliegue en producción.',
      topics: [
        {
          id: 'web-db-orm',
          name: 'Persistencia de Datos y Conexión a Bases de Datos',
          description: 'Modelado relacional, consultas parametrizadas, migraciones y prevención de inyección SQL.',
          difficulty: 'Intermedio',
          estimatedMinutes: 90,
          resources: [
            { id: 'res-web-8', title: 'Persistencia de Datos Segura para Aplicaciones Web', url: 'https://esfot.epn.edu.ec/recursos/web/db-persistencia.pdf', type: 'PDF' }
          ],
          prerequisites: [
            { targetId: 'web-node-express', strength: 'HARD' }
          ]
        },
        {
          id: 'web-deployment',
          name: 'Despliegue y Buenas Prácticas en Producción',
          description: 'Variables de entorno, CORS, cabeceras Helmet, compilación de assets y hosting en la nube.',
          difficulty: 'Avanzado',
          estimatedMinutes: 60,
          resources: [
            { id: 'res-web-9', title: 'Guía de Despliegue y Hardening de Servidores Web', url: 'https://esfot.epn.edu.ec/recursos/web/deployment-prod.pdf', type: 'PDF' }
          ],
          prerequisites: [
            { targetId: 'web-db-orm', strength: 'HARD' },
            { targetId: 'web-auth-jwt', strength: 'HARD' }
          ]
        }
      ]
    }
  ]
};
