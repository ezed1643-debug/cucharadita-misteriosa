export default function Home() {
  return (
    // Quitamos los fondos oscuros predeterminados y dejamos que el layout respire
    <main className="flex min-h-screen flex-col items-center p-8">
      
      {/* Título principal de la tienda */}
      <h1 className="text-4xl md:text-6xl font-serif text-center mt-10 mb-4 tracking-wide text-[#d4af37]">
        Cucharadita Misteriosa
      </h1>
      
      {/* Subtítulo elegante */}
      <p className="text-lg text-center mb-12 max-w-2xl font-light">
        Descubre tu esencia. Maquillaje, cuidado personal y artículos de belleza seleccionados para resaltar tu luz.
      </p>

      {/* Aquí luego pondremos la grilla donde aparecerán tus productos de Firebase */}
      <div className="w-full max-w-5xl text-center p-10 border border-gray-200 rounded-lg bg-white/50 backdrop-blur-sm shadow-sm">
        <p className="text-gray-500 italic">Aquí aparecerá el catálogo de productos...</p>
      </div>

    </main>
  );
}