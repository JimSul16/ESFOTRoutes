/**
 * Semilla Curricular: Redes de Computadoras (ESFOT - EPN)
 */
export const redesSubject = {
  id: 'redes',
  name: 'Redes de Computadoras',
  code: 'CS-RED-301',
  description: 'Fundamentos de networking, arquitecturas OSI y TCP/IP, direccionamiento IPv4/IPv6, enrutamiento estático/dinámico, protocolos de transporte y servicios de red.',
  credits: 4,
  modules: [
    {
      id: 'redes-m1',
      name: 'Módulo 1: Fundamentos y Arquitecturas de Red',
      position: 1,
      description: 'Modelos de referencia OSI y TCP/IP, topologías y principios de comunicación de datos.',
      topics: [
        {
          id: 'redes-intro',
          name: 'Introducción a Redes y Topologías',
          description: 'Conceptos fundamentales de redes, medios de transmisión, topologías físicas y lógicas.',
          difficulty: 'Principiante',
          estimatedMinutes: 45,
          resources: [
            { id: 'res-red-1', title: 'Topologías de Red y Medios Guiados', url: 'https://esfot.epn.edu.ec/recursos/redes/topologias.pdf', type: 'PDF' }
          ],
          prerequisites: []
        },
        {
          id: 'redes-osi-tcp',
          name: 'Modelo OSI vs Modelo TCP/IP',
          description: 'Comparativa de las 7 capas de OSI contra las 4 capas de TCP/IP, encapsulamiento y PDUs.',
          difficulty: 'Principiante',
          estimatedMinutes: 60,
          resources: [
            { id: 'res-red-2', title: 'Guía de Encapsulamiento y Capas OSI', url: 'https://esfot.epn.edu.ec/recursos/redes/osi-tcp.pdf', type: 'PDF' }
          ],
          prerequisites: [
            { targetId: 'redes-intro', strength: 'HARD' }
          ]
        }
      ]
    },
    {
      id: 'redes-m2',
      name: 'Módulo 2: Capas de Enlace y Red (Direccionamiento)',
      position: 2,
      description: 'Subnetting IPv4 con VLSM, direccionamiento IPv6 y conmutación de tramas Ethernet.',
      topics: [
        {
          id: 'redes-ethernet',
          name: 'Ethernet, Conmutación y Direcciones MAC',
          description: 'Tramas 802.3, dominios de colisión y difusión, tablas CAM en switches.',
          difficulty: 'Intermedio',
          estimatedMinutes: 50,
          resources: [
            { id: 'res-red-3', title: 'Operación de Switches Ethernet', url: 'https://esfot.epn.edu.ec/recursos/redes/ethernet.pdf', type: 'PDF' }
          ],
          prerequisites: [
            { targetId: 'redes-osi-tcp', strength: 'HARD' }
          ]
        },
        {
          id: 'redes-ip-vlsm',
          name: 'Direccionamiento IPv4 y Subnetting VLSM',
          description: 'Clases de red, máscaras de longitud variable (VLSM), cálculo de subredes y broadcasts.',
          difficulty: 'Intermedio',
          estimatedMinutes: 90,
          resources: [
            { id: 'res-red-4', title: 'Manual Práctico de Cálculo VLSM', url: 'https://esfot.epn.edu.ec/recursos/redes/vlsm-practica.pdf', type: 'PDF' }
          ],
          prerequisites: [
            { targetId: 'redes-ethernet', strength: 'HARD' }
          ]
        },
        {
          id: 'redes-ipv6',
          name: 'Fundamentos de Direccionamiento IPv6',
          description: 'Estructura de direcciones de 128 bits, tipos de direcciones (Unicast, Multicast, Anycast) y SLAAC.',
          difficulty: 'Intermedio',
          estimatedMinutes: 60,
          resources: [
            { id: 'res-red-5', title: 'Transición y Direccionamiento IPv6', url: 'https://esfot.epn.edu.ec/recursos/redes/ipv6.pdf', type: 'PDF' }
          ],
          prerequisites: [
            { targetId: 'redes-ip-vlsm', strength: 'SOFT' }
          ]
        }
      ]
    },
    {
      id: 'redes-m3',
      name: 'Módulo 3: Enrutamiento y Capa de Transporte',
      position: 3,
      description: 'Enrutamiento estático vs dinámico (OSPF/RIP), sockets TCP vs UDP y control de flujo.',
      topics: [
        {
          id: 'redes-routing',
          name: 'Principios de Enrutamiento (Estático y OSPF)',
          description: 'Tablas de enrutamiento, métricas, distancia administrativa y configuración OSPF de área única.',
          difficulty: 'Avanzado',
          estimatedMinutes: 80,
          resources: [
            { id: 'res-red-6', title: 'Laboratorio de Enrutamiento OSPF', url: 'https://esfot.epn.edu.ec/recursos/redes/ospf-lab.pdf', type: 'PDF' }
          ],
          prerequisites: [
            { targetId: 'redes-ip-vlsm', strength: 'HARD' }
          ]
        },
        {
          id: 'redes-tcp-udp',
          name: 'Capa de Transporte: Protocolos TCP y UDP',
          description: 'Handshake de 3 vías, control de congestión, números de puerto y sockets.',
          difficulty: 'Intermedio',
          estimatedMinutes: 60,
          resources: [
            { id: 'res-red-7', title: 'Análisis de Flujos TCP/UDP con Wireshark', url: 'https://esfot.epn.edu.ec/recursos/redes/tcp-wireshark.pdf', type: 'PDF' }
          ],
          prerequisites: [
            { targetId: 'redes-osi-tcp', strength: 'HARD' }
          ]
        }
      ]
    },
    {
      id: 'redes-m4',
      name: 'Módulo 4: Servicios de Red y Seguridad Básica',
      position: 4,
      description: 'Resolución de nombres (DNS), asignación dinámica (DHCP), NAT y listas de control de acceso (ACL).',
      topics: [
        {
          id: 'redes-servicios',
          name: 'Servicios de Red: DNS, DHCP y NAT',
          description: 'Funcionamiento del protocolo DNS, ciclo DHCP DORA y traducción de direcciones de red (PAT/NAT).',
          difficulty: 'Intermedio',
          estimatedMinutes: 70,
          resources: [
            { id: 'res-red-8', title: 'Configuración de Servidores DHCP y DNS', url: 'https://esfot.epn.edu.ec/recursos/redes/servicios-dns-dhcp.pdf', type: 'PDF' }
          ],
          prerequisites: [
            { targetId: 'redes-ip-vlsm', strength: 'HARD' },
            { targetId: 'redes-tcp-udp', strength: 'HARD' }
          ]
        },
        {
          id: 'redes-seguridad',
          name: 'Seguridad en Redes: Firewalls, ACLs y VPNs',
          description: 'Filtrado de paquetes mediante ACLs estándar y extendidas, túneles IPsec y perímetros de seguridad.',
          difficulty: 'Avanzado',
          estimatedMinutes: 85,
          resources: [
            { id: 'res-red-9', title: 'Implementación de ACLs en Routers', url: 'https://esfot.epn.edu.ec/recursos/redes/acls-seguridad.pdf', type: 'PDF' }
          ],
          prerequisites: [
            { targetId: 'redes-servicios', strength: 'HARD' }
          ]
        }
      ]
    }
  ]
};
