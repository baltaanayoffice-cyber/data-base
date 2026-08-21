// libro1.js – Datos del libro de ejemplo
export default {
    // Metadatos
    title: 'El Bosque Animado',
    author: 'Anónimo',
    coverColor: '#2a4a5a',

    // Duración de cada página en segundos (para el audiolibro)
    pageDuration: 12,

    // Duración total del audio (opcional, se calcula automáticamente si no se indica)
    audioDuration: 240, // 4 minutos

    // Páginas: cada una puede tener imagen (ruta) o texto/color generado
    pages: [
        { color: '#1e2a3a', text: 'Hola' },
        { color: '#2a3a4a', text: '2' },
        { color: '#3a4a5a', text: '3' },
        { color: '#4a5a6a', text: '4' },
        { color: '#5a6a7a', text: '5' },
        { color: '#6a4a3a', text: '6' },
        { color: '#7a5a4a', text: '7' },
        { color: '#8a6a5a', text: '8' },
        { color: '#9a7a6a', text: '9' },
        { color: '#aa8a7a', text: '10' },
        { color: '#3a5a3a', text: '11' },
        { color: '#4a6a4a', text: '12' },
        { color: '#5a7a5a', text: '13' },
        { color: '#6a8a6a', text: '14' },
        { color: '#7a9a7a', text: '15' },
        { color: '#5a3a5a', text: '16' },
        { color: '#6a4a6a', text: '17' },
        { color: '#7a5a7a', text: '18' },
        { color: '#8a6a8a', text: '19' },
        { color: '#9a7a9a', text: '20' }
    ]
};
