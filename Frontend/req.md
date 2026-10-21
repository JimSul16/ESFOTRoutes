RECOPILACIÓN DE REQUERIMIENTOS
TIPO DE SISTEMA	ID - RR	ENUNCIADO DEL ITEM
Fronted



	RR-001	Para los usuarios administrador y estudiante se requiere:
• Inicio de sesión y cierre de sesión
• Acceso a las opciones y vistas del sistema según su rol
• Visualización y actualización de información de perfil
	RR-002	Para los usuarios administrador y estudiante se requiere:
• Recuperación de contraseña
• Actualización de contraseña
	RR-003	El estudiante podrá registrarse en la plataforma mediante un formulario con sus datos personales.
	RR-004	El estudiante podrá subir y actualizar su fotografía de perfil, así como consultar su nivel de experiencia acumulada y el resumen de su progreso.
	RR-005	El administrador podrá gestionar los usuarios registrados:
• Consultar el listado general de usuarios y ver el detalle individual de cada uno
• Gestionar el estado de las cuentas
	RR-006	Los usuarios administrador y estudiante podrán explorar el catálogo de materiales didácticos y consultar la información detallada de un recurso específico.
	RR-007	El administrador podrá crear, modificar y eliminar los recursos educativos de la biblioteca digital.
	RR-008	El administrador podrá diseñar rutas de aprendizaje públicas, organizando sus módulos y asociando los recursos de estudio existentes.
	RR-009	El administrador podrá actualizar los contenidos y la estructura de las rutas de aprendizaje, eliminarlas, y subir y asociar una imagen de portada para su identificación visual.
	RR-010	El estudiante podrá explorar el catálogo de rutas públicas disponibles e inscribirse en la ruta de su interés.
	RR-011	El estudiante podrá acceder al listado de las rutas en las que está inscrito y de las generadas de forma personalizada, así como visualizar la secuencia de módulos y recursos de cada ruta con su estado de avance.
	RR-012	Para el seguimiento del progreso, el estudiante necesita:
• Registrar la aprobación de temas o módulos completados
• Visualizar su porcentaje general de avance
	RR-013	El estudiante podrá completar su autodiagnóstico inicial mediante una autoevaluación por temas, indicando su nivel de conocimiento en cada tema de las asignaturas piloto.
	RR-014	El estudiante podrá generar una ruta de aprendizaje personalizada a partir de su autodiagnóstico y su progreso registrado, y visualizar la secuencia de temas y recursos recomendados.
	RR-015	El estudiante podrá realizar consultas pedagógicas al asistente virtual con Inteligencia Artificial mediante una interfaz de chat y visualizar sus respuestas.




Tabla 2 HU-001 Iniciar y cerrar sesión
HISTORIA DE USUARIO
Identificador: HU001		Usuario: Administrador y Estudiante
Nombre historia: Inicio de sesión, acceso por rol y perfil
Prioridad en negocio: Alta		Riesgo en desarrollo: Media
Iteración asignada: 1
Responsable (s): Alexander David Cajamarca García
Descripción: 
Como administrador o estudiante, quiero iniciar y cerrar sesión, ver solo las opciones que corresponden a mi rol y consultar y actualizar mi perfil, para usar la plataforma de forma segura y con mis datos al día.
Observación: 
Esta historia es la base de las demás, ya que sin el acceso al sistema no se puede usar ninguna otra pantalla. Además, depende de que el servidor responda bien al ingreso de las credenciales, por lo que se coordina con el responsable del backend.
Criterios de Aceptación: 
• La pantalla de inicio de sesión solicita las credenciales y muestra un mensaje claro cuando los datos son incorrectos.
• Al ingresar, el administrador y el estudiante ven únicamente las opciones propias de su rol.
• Cuando un usuario intenta abrir una pantalla que no le corresponde, el sistema lo redirige y no muestra su contenido.
• El usuario cierra su sesión desde cualquier pantalla y vuelve al inicio de sesión.
• El usuario visualiza sus datos personales y los actualiza mediante un formulario que confirma el cambio.

Tabla 3 HU-002 Recuperación y cambio de contraseña
HISTORIA DE USUARIO
Identificador: HU002		Usuario: Administrador y Estudiante
Nombre historia: Recuperación y cambio de contraseña
Prioridad en negocio: Medio	Riesgo en desarrollo: Medio
Iteración asignada: 1
Responsable (s): Alexander David Cajamarca García
Descripción: 
Como administrador o estudiante, quiero recuperar mi contraseña si la olvido y cambiarla cuando lo necesito, para mantener el acceso a mi cuenta y proteger mi información.
Observación: 
La recuperación depende de que el sistema envíe un mensaje al usuario, por lo que esta función se acuerda con el responsable del backend. Por otra parte, el cambio de contraseña se realiza desde el perfil, con el usuario ya dentro del sistema.
Criterios de Aceptación: 
• La pantalla de inicio de sesión incluye una opción para recuperar la contraseña.
• El usuario solicita la recuperación y el sistema le informa que recibe las instrucciones para continuar.
• El usuario establece una nueva contraseña mediante un formulario que verifica que ambos campos coinciden.
• Desde su perfil, el usuario cambia su contraseña ingresando la actual y la nueva.
• Si los datos no son válidos, el sistema muestra un mensaje que explica qué corregir.
• Después de un cambio exitoso, el sistema confirma la acción.

Tabla 4 HU-003
HISTORIA DE USUARIO
Identificador: HU003		Usuario: Estudiante
Nombre historia: Registro de estudiante
Prioridad en negocio: Alta	Riesgo en desarrollo: Baja
Iteración asignada: 1
Responsable (s): Alexander David Cajamarca García
Descripción: 
Como estudiante, quiero registrarme en la plataforma con mis datos personales, para crear mi cuenta y empezar a usar mis rutas de aprendizaje.
Observación: 
Este es el punto de entrada de los estudiantes nuevos. Además, los campos del formulario se definen junto con el responsable del backend para que coincidan con los datos que el sistema guarda.
Criterios de Aceptación:
• La pantalla de registro muestra un formulario con los datos personales requeridos.
• Los campos obligatorios se señalan y el sistema avisa cuando alguno está vacío o es incorrecto.
• El estudiante crea su cuenta al completar el formulario y recibe una confirmación.
• Si la cuenta ya existe, el sistema lo informa.
• Después del registro, el estudiante accede al sistema o es dirigido a iniciar sesión.
• La pantalla se ve correctamente en computador y en celular.

Tabla 5 HU-004
HISTORIA DE USUARIO
Identificador: HU004		Usuario: Estudiante
Nombre historia: Fotografía de perfil, nivel de experiencia y resumen de progreso
Prioridad en negocio: Medio	Riesgo en desarrollo: Medio
Iteración asignada: 4
Responsable (s): Alexander David Cajamarca García
Descripción: 
Como estudiante, quiero subir mi fotografía de perfil y ver mi nivel de experiencia y el resumen de mi progreso, para personalizar mi cuenta y conocer cómo avanzo.
Observación: 
La carga de la fotografía usa el componente de carga de archivos que se construye en esta iteración. Por otra parte, el resumen de progreso muestra información que se registra en historias anteriores, por lo que depende de ellas.
Criterios de Aceptación:
• El estudiante selecciona una imagen desde su dispositivo y la ve antes de guardarla.
• El sistema acepta solo imágenes y avisa cuando el archivo no es adecuado o es demasiado pesado.
• La fotografía nueva reemplaza a la anterior y se muestra en el perfil.
• El perfil muestra el nivel de experiencia del estudiante de forma clara.
• El perfil presenta un resumen de su progreso con datos fáciles de interpretar.
• Si no hay fotografía, el sistema muestra una imagen por defecto.

Tabla 6 HU-005
HISTORIA DE USUARIO
Identificador: HU005		Usuario: Administrador
Nombre historia: Gestión de usuarios registrados
Prioridad en negocio: Media	Riesgo en desarrollo: Baja
Iteración asignada: 1
Responsable (s): Alexander David Cajamarca García
Descripción: 
Como administrador, quiero ver la lista de usuarios registrados, consultar el detalle de cada uno y cambiar el estado de su cuenta, para mantener un control ordenado de quienes usan la plataforma.
Observación: 
Esta función es exclusiva del administrador. Asimismo, el cambio de estado de una cuenta se confirma antes de aplicarse para evitar errores.
Criterios de Aceptación: 
• El administrador ve una lista de los usuarios registrados con sus datos principales, de forma ordenada y fácil de recorrer.
• Al elegir un usuario, el sistema muestra su información completa.
• El administrador cambia el estado de una cuenta y el sistema pide confirmación antes de aplicar el cambio.
• Después del cambio, la lista refleja el nuevo estado.
• Los estudiantes no acceden a esta pantalla.

Tabla 7 HU-006
HISTORIA DE USUARIO
Identificador: HU006		Usuario: Administrador y Estudiante
Nombre historia: Exploración del catálogo de recursos
Prioridad en negocio: Alta	Riesgo en desarrollo: Baja
Iteración asignada: 2
Responsable (s): Alexander David Cajamarca García
Descripción: 
Como administrador o estudiante, quiero explorar el catálogo de materiales didácticos y ver el detalle de cada recurso, para encontrar el material que necesito para estudiar o revisar.
Observación: 
El catálogo es la base de las rutas de aprendizaje, ya que los recursos que se muestran aquí son los mismos que se asocian a las rutas. Además, la pantalla se adapta al tamaño del dispositivo para que se use cómodamente desde el celular.
Criterios de Aceptación:
• El catálogo muestra los recursos de forma ordenada, con su título y sus datos principales.
• El usuario abre un recurso y ve su descripción y demás información relevante.
• Cuando no hay recursos disponibles, el sistema muestra un mensaje que lo indica.
• El catálogo se visualiza correctamente en computador, tableta y celular.
• Mientras la información se carga, el sistema muestra un aviso de espera.

Tabla 8 HU-007
HISTORIA DE USUARIO
Identificador: HU007		Usuario: Administrador
Nombre historia: Gestión de recursos educativos
Prioridad en negocio: Alta	Riesgo en desarrollo: Media
Iteración asignada: 2
Responsable (s): Alexander David Cajamarca García
Descripción: 
Como administrador, quiero crear, modificar y eliminar recursos educativos, para mantener actualizada la biblioteca digital de las asignaturas piloto.
Observación: 
Esta historia incluye formularios con varios datos, por lo que se cuida que sean claros y fáciles de completar. Sin embargo, queda por definir con el responsable del backend qué ocurre con las rutas que usan un recurso que se elimina.
Criterios de Aceptación:
• El administrador accede a un panel que lista los recursos con opciones para crear, editar y eliminar.
• El formulario de creación pide los datos del recurso y señala los campos obligatorios.
• Al editar, el formulario muestra los datos actuales y guarda los cambios con una confirmación.
• Antes de eliminar un recurso, el sistema pide confirmación al administrador.
• Después de cada acción, la lista se actualiza y el sistema muestra un mensaje de éxito o de error.
• Los estudiantes no ven este panel.

Tabla 9 HU-008
HISTORIA DE USUARIO
Identificador: HU008	Usuario: Administrador
Nombre historia: Diseño de rutas de aprendizaje públicas
Prioridad en negocio: Alta	Riesgo en desarrollo: Alta
Iteración asignada: 3
Responsable (s): Alexander David Cajamarca García
Descripción: 
Como administrador, quiero crear una ruta de aprendizaje pública organizando sus módulos y asociando recursos existentes, para ofrecer a los estudiantes un camino de estudio ordenado.
Observación: 
Es una de las pantallas más elaboradas del sistema, porque el administrador ordena módulos y recursos, por lo que se prueba con cuidado su facilidad de uso. Además, se apoya en el catálogo de recursos de la iteración anterior.
Criterios de Aceptación:
• El administrador ingresa el nombre y la descripción de la ruta en un formulario.
• El administrador agrega módulos a la ruta y define el orden en que se presentan.
• Dentro de cada módulo, el administrador elige recursos del catálogo para asociarlos.
• La pantalla muestra en todo momento cómo queda armada la ruta.
• Al guardar, el sistema confirma que la ruta se crea y la muestra en el listado de rutas.
• Si falta información necesaria, el sistema indica qué completar antes de guardar.

Tabla 10 HU-009
HISTORIA DE USUARIO
Identificador: HU009		Usuario: Administrador
Nombre historia: Actualización, eliminación y portada de rutas
Prioridad en negocio: Media	Riesgo en desarrollo: Media
Iteración asignada: 3
Responsable (s): Alexander David Cajamarca García
Descripción: 
Como administrador, quiero actualizar el contenido y la estructura de una ruta, eliminarla y asignarle una imagen de portada, para mantener las rutas al día y fáciles de reconocer.
Observación: 
La actualización y la eliminación se desarrollan en el Sprint 3, junto con el diseño de rutas. Por otra parte, la carga de la imagen de portada usa el componente de carga de archivos del Sprint 4, por lo que esa parte se completa en ese momento.
Criterios de Aceptación:
• El administrador abre una ruta existente y modifica sus datos, sus módulos y sus recursos.
• Los cambios se guardan con una confirmación y se reflejan en la ruta.
• Antes de eliminar una ruta, el sistema pide confirmación.
• El administrador selecciona una imagen de portada, la ve antes de guardarla y queda asociada a la ruta.
• La portada se muestra en el listado de rutas.
• El sistema acepta solo imágenes y avisa cuando el archivo no es adecuado.

Tabla 11 HU-010
HISTORIA DE USUARIO
Identificador: HU010		Usuario: Estudiante
Nombre historia: Exploración de rutas públicas e inscripción
Prioridad en negocio: Alta	Riesgo en desarrollo: Baja
Iteración asignada: 3
Responsable (s): Alexander David Cajamarca García
Descripción: 
Como estudiante, quiero explorar las rutas públicas y inscribirme en la que me interesa, para comenzar a estudiar con una guía clara.
Observación: 
Esta historia conecta el trabajo del administrador, que crea las rutas, con el estudiante, que las usa. Además, el estudiante ve con claridad cuándo ya está inscrito para no repetir la inscripción.
Criterios de Aceptación: 
• El catálogo de rutas públicas muestra cada ruta con su portada, su nombre y una descripción breve.
• El estudiante abre una ruta y ve sus módulos y su contenido antes de inscribirse.
• El estudiante se inscribe con una acción simple y el sistema confirma la inscripción.
• Si el estudiante ya está inscrito, la pantalla lo indica y no vuelve a ofrecer la inscripción.
• Después de inscribirse, la ruta aparece en su listado de rutas.

Tabla 12 HU-011
HISTORIA DE USUARIO
Identificador: HU011		Usuario: Estudiante
Nombre historia: Mis rutas y secuencia de estudio
Prioridad en negocio: Alta	Riesgo en desarrollo: Alta
Iteración asignada: 3
Responsable (s): Alexander David Cajamarca García
Descripción: 
Como estudiante, quiero ver las rutas en las que estoy inscrito y las rutas personalizadas que se generan para mí, y recorrer la secuencia de sus módulos y recursos con mi estado de avance, para saber qué he estudiado y qué sigue.
Observación: 
Es la pantalla central del proyecto, ya que presenta la secuencia de estudio de forma visual. Sin embargo, su diseño es el más exigente por la forma en que se muestran los módulos y su orden, por lo que se valida con prototipos antes de programarla.
Criterios de Aceptación:
• El estudiante ve un listado con sus rutas inscritas y sus rutas personalizadas, diferenciadas entre sí.
• Al abrir una ruta, el sistema muestra los módulos y recursos en el orden recomendado.
• Cada módulo o recurso indica de forma visual si está aprobado o pendiente.
• El estudiante abre un recurso directamente desde la ruta.
• La vista se adapta al computador y al celular y se entiende sin explicaciones adicionales.
• Si el estudiante no tiene rutas, el sistema muestra un mensaje que lo invita a explorarlas.

Tabla 13 HU-012
HISTORIA DE USUARIO
Identificador: HU012	Usuario: Estudiante
Nombre historia: Seguimiento del progreso
Prioridad en negocio: Alta	Riesgo en desarrollo: Media
Iteración asignada: 3
Responsable (s): Alexander David Cajamarca García
Descripción: 
Como estudiante, quiero registrar los temas o módulos que apruebo y ver mi porcentaje de avance, para conocer mi progreso y mantenerme motivado.
Observación: 
El porcentaje de avance se calcula con la información que entrega el sistema y la interfaz se encarga de mostrarlo de forma clara. Asimismo, cada vez que el estudiante registra un tema aprobado, el avance se actualiza sin salir de la pantalla.
Criterios de Aceptación:
• El estudiante marca un tema o módulo como aprobado desde su ruta.
• El sistema confirma el registro de la aprobación.
• El porcentaje de avance se muestra como un número acompañado de una barra de progreso.
• Después de registrar un tema, el porcentaje se actualiza de inmediato.
• El estado del tema cambia a aprobado dentro de la ruta.
• Si ocurre un error al guardar, el sistema lo informa y el tema no cambia de estado.

Tabla 14 HU-013
HISTORIA DE USUARIO
Identificador: HU013		Usuario: Estudiante
Nombre historia: Autodiagnóstico inicial
Prioridad en negocio: Alta	Riesgo en desarrollo: Alta
Iteración asignada: 3
Responsable (s): Alexander David Cajamarca García
Descripción: 
Como estudiante, quiero completar un autodiagnóstico indicando mi nivel de conocimiento en cada tema de las asignaturas piloto, para que el sistema conozca mi punto de partida.
Observación: 
El autodiagnóstico es una autoevaluación por temas y su formato final se acuerda con el responsable del backend. Además, el formulario agrupa los temas por asignatura y módulo para que no resulte largo ni confuso.
Criterios de Aceptación:
• El estudiante ve los temas de Desarrollo de Aplicaciones Web y Redes de Computadoras agrupados por módulo.
• Para cada tema, el estudiante elige su nivel de conocimiento entre opciones sencillas.
• El sistema muestra cuántos temas faltan por responder.
• El sistema avisa si falta algún tema por responder antes de enviar el autodiagnóstico.
• Al enviarlo, el sistema confirma que el autodiagnóstico se guarda y ofrece generar la ruta.
• La pantalla se usa con comodidad desde el celular.

Tabla 15 HU-014
HISTORIA DE USUARIO
Identificador: HU014		Usuario: Estudiante
Nombre historia: Generación de ruta personalizada
Prioridad en negocio: Alta	Riesgo en desarrollo: Alta
Iteración asignada: 3
Responsable (s): Alexander David Cajamarca García
Descripción: 
Como estudiante, quiero generar una ruta de aprendizaje personalizada a partir de mi autodiagnóstico y mi progreso, y ver la secuencia de temas y recursos que me recomienda, para estudiar primero lo que más necesito reforzar.
Observación: 
El cálculo de la ruta lo realiza el backend y la interfaz se encarga de solicitarlo y de mostrar el resultado. No obstante, como este proceso puede tardar unos segundos, la pantalla muestra un aviso de espera. Adicional a ello, esta historia depende de que el autodiagnóstico esté completo.
Criterios de Aceptación:
• El estudiante genera su ruta con una acción visible, siempre que haya completado su autodiagnóstico.
• Si no ha completado el autodiagnóstico, el sistema le indica que debe hacerlo primero y lo dirige a esa pantalla.
• Mientras se genera la ruta, el sistema muestra un aviso de espera.
• La ruta generada muestra los temas y recursos en el orden recomendado y destaca los que necesitan refuerzo.
• La nueva ruta aparece en el listado de rutas personalizadas del estudiante.
• Si ocurre un error, el sistema muestra un mensaje claro y permite intentarlo de nuevo.

Tabla 16 HU-015
HISTORIA DE USUARIO
Identificador: HU015		Usuario: Estudiante
Nombre historia: Consultas al asistente virtual
Prioridad en negocio: Alta	Riesgo en desarrollo: Alta
Iteración asignada: 4
Responsable (s): Alexander David Cajamarca García
Descripción: 
Como estudiante, quiero hacer preguntas sobre los temas de estudio a un asistente virtual y leer sus respuestas, para resolver mis dudas sin salir de la plataforma.
Observación: 
El asistente responde solo con los recursos del sistema y la interfaz se encarga de ofrecer una conversación cómoda. Sin embargo, como las respuestas pueden tardar unos segundos, la pantalla muestra que el asistente prepara su respuesta. Por otra parte, el funcionamiento del asistente depende del backend.
Criterios de Aceptación:
• El estudiante escribe su pregunta en un cuadro de texto y la envía con un botón o con la tecla Enter.
• La conversación muestra las preguntas y las respuestas en orden y diferenciadas visualmente.
• Mientras el asistente responde, el sistema muestra un aviso de espera.
• Si ocurre un error, el sistema lo informa y permite volver a enviar la pregunta.
• El historial de la conversación se mantiene visible mientras el estudiante la usa.
• El chat se usa con comodidad desde el celular.


