"use client";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase"; 
import { Card, CardBody, CardFooter, Image, Button } from "@nextui-org/react";

export default function Home() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [cargandoPagos, setCargandoPagos] = useState(false);

  // Traemos los cosméticos desde Firebase y los ordenamos
  useEffect(() => {
    const obtenerProductos = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "productos"));
        const docs = [];
        querySnapshot.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data() });
        });
        
        // ORDEN ALFABÉTICO (De la A a la Z por el nombre)
        docs.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
        
        setProductos(docs);
      } catch (error) {
        console.error("Error al cargar los productos:", error);
      }
    };
    obtenerProductos();
  }, []);

  // Función para sumar productos al carrito
  const agregarAlCarrito = (producto) => {
    setCarrito([...carrito, { ...producto, cantidad: 1 }]);
  };

  // Calculamos el total
  const totalCarrito = carrito.reduce((total, item) => total + Number(item.precio), 0);

  // Función para cobrar
  const pagarConMercadoPago = async () => {
    setCargandoPagos(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carrito, costoEnvio: 0 }), 
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; 
      }
    } catch (error) {
      console.error("Error al procesar pago", error);
      alert("Hubo un error al ir a pagar.");
    } finally {
      setCargandoPagos(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-12">
      
      {/* CABECERA ELEGANTE */}
      <div className="w-full max-w-7xl mb-12 text-center">
        <h1 className="text-5xl md:text-6xl font-serif mt-6 mb-4 text-[#B5838D]">
          Cucharadita Misteriosa
        </h1>
        <p className="text-lg md:text-xl font-light max-w-2xl mx-auto text-[#6D6875]">
          Descubre tu esencia. Maquillaje, cuidado personal y artículos de belleza seleccionados para resaltar tu luz.
        </p>
      </div>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="flex flex-col lg:flex-row gap-10 w-full max-w-7xl">
        
        {/* SECCIÓN DEL CATÁLOGO */}
        <div className="flex-1">
          <h2 className="text-2xl font-serif mb-6 text-[#4A4A4A] border-b pb-2">Nuestros Productos</h2>
          
          {/* GRILLA EN 2 COLUMNAS (sm:grid-cols-2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {productos.length === 0 ? (
              <p className="italic text-gray-400">Aún no hay productos cargados en la tienda...</p>
            ) : (
              productos.map((prod) => (
                <Card key={prod.id} shadow="sm" className="bg-white border-none hover:shadow-md transition-shadow">
                  <CardBody className="overflow-visible p-0 relative">
                    
                    {/* Etiqueta de Categoría sobre la foto */}
                    {prod.categoria && (
                      <span className="absolute top-3 left-3 z-10 px-3 py-1 text-[10px] font-bold tracking-wider text-white bg-[#B5838D]/90 backdrop-blur-sm rounded-full uppercase shadow-sm">
                        {prod.categoria}
                      </span>
                    )}

                    <Image
                      shadow="none"
                      radius="none"
                      width="100%"
                      alt={prod.nombre}
                      className="w-full object-cover h-[250px]"
                      src={prod.imagenUrl || "https://via.placeholder.com/250"}
                    />
                  </CardBody>
                  
                  <CardFooter className="flex-col items-start gap-2 p-5">
                    <div className="w-full">
                      <b className="text-md font-medium text-[#4A4A4A] uppercase tracking-wide">{prod.nombre}</b>
                      
                      {/* Descripción del producto */}
                      {prod.descripcion && (
                        <p className="text-sm text-[#6D6875] font-light mt-1 line-clamp-2 leading-relaxed">
                          {prod.descripcion}
                        </p>
                      )}
                    </div>
                    
                    <div className="w-full flex items-center justify-between mt-2">
                      <p className="text-[#B5838D] text-xl font-semibold">${prod.precio}</p>
                      
                      {/* Avisos de Stock */}
                      {prod.stock === 0 ? (
                        <span className="text-xs text-red-400 font-medium bg-red-50 px-2 py-1 rounded-md">Agotado</span>
                      ) : prod.stock <= 3 ? (
                        <span className="text-xs text-orange-400 font-medium bg-orange-50 px-2 py-1 rounded-md">¡Últimos {prod.stock}!</span>
                      ) : null}
                    </div>

                    <Button 
                      className="w-full mt-3 text-white font-medium shadow-sm bg-[#E5989B] hover:bg-[#B5838D]" 
                      onClick={() => agregarAlCarrito(prod)}
                      isDisabled={prod.stock === 0} // Bloquea el botón si no hay stock
                    >
                      {prod.stock === 0 ? "Sin stock" : "Añadir al carrito"}
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* SECCIÓN DEL CARRITO */}
        <div className="w-full lg:w-80 h-fit sticky top-6 bg-white p-6 rounded-2xl shadow-sm border border-[#FCD5CE]">
          <h2 className="text-2xl font-serif mb-6 text-[#B5838D]">Tu Compra</h2>
          
          {carrito.length === 0 ? (
            <p className="text-gray-400 font-light text-center py-8">Tu carrito está vacío.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {carrito.map((item, index) => (
                <div key={index} className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-sm font-medium text-[#6D6875] truncate w-2/3">{item.nombre}</span>
                  <span className="text-sm text-[#4A4A4A]">${item.precio}</span>
                </div>
              ))}
              
              <div className="flex justify-between items-center mt-2 pt-4 font-bold text-lg text-[#4A4A4A]">
                <span>Total:</span>
                <span>${totalCarrito}</span>
              </div>
              
              <Button 
                className="w-full mt-4 bg-[#6D6875] text-white text-md shadow-md hover:bg-[#4A4A4A]"
                isLoading={cargandoPagos}
                onClick={pagarConMercadoPago}
              >
                Pagar con Mercado Pago
              </Button>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}