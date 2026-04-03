import "./globals.css";

// Estos son los datos que leerán los buscadores como Google y la pestaña del navegador
export const metadata = {
  title: "Cucharadita Misteriosa | Cosmética y Belleza",
  description: "Tu espacio exclusivo de maquillaje, cuidado personal y artículos de belleza. Resalta tu esencia con nuestra selección de productos.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      {/* Aquí aplicamos la estética "Beauty": 
        - bg-[#FCF9F6]: Fondo color crema/perla muy suave.
        - text-[#4A4A4A]: Texto gris oscuro (más elegante y menos agresivo que el negro puro).
        - antialiased: Suaviza los bordes de las letras para que se vean más premium.
        - min-h-screen: Asegura que el fondo cubra siempre toda la pantalla.
      */}
      <body className="bg-[#FCF9F6] text-[#4A4A4A] antialiased min-h-screen">
        {/* Si tenías configurado un <Providers> de NextUI, asegúrate de envolver {children} con él */}
        {children}
      </body>
    </html>
  );
}