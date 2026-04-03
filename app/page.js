"use client";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase"; 
import { Card, CardBody, CardFooter, Image, Button } from "@nextui-org/react";
import { Playfair_Display } from 'next/font/google';

const playfair = Playfair_Display({ 
  subsets: ['latin'], 
  weight: ['400', '600', '700'], 
  style: ['italic', 'normal'] 
});

export default function Home() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [cargandoPagos, setCargandoPagos] = useState(false);

  useEffect(() => {
    const obtenerProductos = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "productos"));
        const docs = [];
        querySnapshot.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data() });
        });
        docs.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
        setProductos(docs);
      } catch (error) {
        console.error("Error al cargar los productos:", error);
      }
    };
    obtenerProductos();
  }, []);

  // LÓGICA DE AGRUPACIÓN Y STOCK
  const agregarAlCarrito = (producto) => {
    const itemEnCarrito = carrito.find((item) => item.id === producto.id);
    const cantidadActual = itemEnCarrito ? itemEnCarrito.cantidad : 0;

    // Verificar si hay stock disponible para sumar uno más
    if (cantidadActual >= producto.stock) {
      alert("Lo sentimos, no hay más unidades disponibles de este producto.");
      return;
    }

    if (itemEnCarrito) {
      // Si ya existe, aumentamos la cantidad
      setCarrito(
        carrito.map((item) =>
          item.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        )
      );
    } else {
      // Si no existe, lo agregamos con cantidad 1
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
    }
  };

  const eliminarDelCarrito = (idAEliminar) => {
    setCarrito(carrito.filter((item) => item.id !== idAEliminar));
  };

  // Cálculo del total considerando cantidades
  const totalCarrito = carrito.reduce(
    (total, item) => total + Number(item.precio) * item.cantidad,
    0
  );

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
    } finally {
      setCargandoPagos(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-3 sm:p-6 md:p-12">
      
      {/* CABECERA */}
      <div className="w-full max-w-7xl mb-8 md:mb-12 text-center mt-4">
        <h1 className={`${playfair.className} text-4xl sm:text-5xl md:text-6xl font-bold mb-3 text-[#B5838D] italic tracking-wide`}>
          Cucharadita Misteriosa
        </h1>
        <p className="text-sm sm:text-lg md:text-xl font-light max-w-2xl mx-auto text-[#6D6875] px-2">
          Maquillaje y artículos de belleza seleccionados para resaltar tu luz.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl">
        
        {/* CATÁLOGO */}
        <div className="flex-1">
          <h2 className={`${playfair.className} text-2xl mb-4 md:mb-6 text-[#4A4A4A] border-b pb-2`}>
            Nuestros Productos
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
            {productos.map((prod) => {
              // Calculamos cuántos hay de este producto en el carrito para bloquear el botón
              const cantidadEnCarrito = carrito.find(i => i.id === prod.id)?.cantidad || 0;
              const sinStockDisponible = prod.stock === 0 || cantidadEnCarrito >= prod.stock;

              return (
                <Card key={prod.id} shadow="sm" className="bg-white border-none">
                  <CardBody className="overflow-visible p-0 relative">
                    {prod.categoria && (
                      <span className="absolute top-2 left-2 z-10 px-2 py-1 text-[8px] sm:text-[10px] font-bold tracking-wider text-white bg-[#B5838D]/90 backdrop-blur-sm rounded-full uppercase shadow-sm">
                        {prod.categoria}
                      </span>
                    )}
                    <Image
                      shadow="none" radius="none" width="100%" alt={prod.nombre}
                      className="w-full object-cover h-[160px] sm:h-[250px]"
                      src={prod.imagenUrl || "https://via.placeholder.com/250"}
                    />
                  </CardBody>
                  
                  <CardFooter className="flex-col items-start gap-1 p-3 sm:p-5">
                    <b className="text-xs sm:text-md font-medium text-[#4A4A4A] uppercase tracking-wide line-clamp-1">{prod.nombre}</b>
                    {prod.descripcion && (
                      <p className="text-[10px] sm:text-sm text-[#6D6875] font-light line-clamp-2">{prod.descripcion}</p>
                    )}
                    
                    <div className="w-full flex items-center justify-between mt-1 sm:mt-2">
                      <p className="text-[#B5838D] text-sm sm:text-xl font-semibold">${prod.precio}</p>
                      {prod.stock === 0 && (
                        <span className="text-[9px] sm:text-xs text-red-400 font-medium bg-red-50 px-1 py-0.5 rounded-md uppercase">Agotado</span>
                      )}
                    </div>

                    <Button 
                      size="sm"
                      className={`w-full mt-2 text-white text-[10px] sm:text-sm font-medium shadow-sm ${sinStockDisponible ? 'bg-gray-300' : 'bg-[#E5989B] hover:bg-[#B5838D]'}`} 
                      onClick={() => agregarAlCarrito(prod)}
                      isDisabled={sinStockDisponible} 
                    >
                      {prod.stock === 0 ? "Agotado" : cantidadEnCarrito >= prod.stock ? "Límite alcanzado" : "Añadir"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>

        {/* CARRITO AGRUPADO */}
        <div className="w-full lg:w-80 h-fit sticky top-6 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-[#FCD5CE]">
          <h2 className={`${playfair.className} text-xl sm:text-2xl mb-4 sm:mb-6 text-[#B5838D]`}>Tu Compra</h2>
          
          {carrito.length === 0 ? (
            <p className="text-gray-400 font-light text-center py-8 text-sm">Tu carrito está vacío.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {carrito.map((item) => (
                <div key={item.id} className="flex justify-between items-start border-b border-gray-100 pb-3">
                  <div className="flex flex-col w-[70%]">
                    <span className="text-xs sm:text-sm font-medium text-[#4A4A4A] leading-tight">{item.nombre}</span>
                    <span className="text-[10px] sm:text-xs text-[#B5838D] mt-1">
                      Cant: {item.cantidad} x ${item.precio}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-[#4A4A4A]">
                      ${item.precio * item.cantidad}
                    </span>
                    <button 
                      onClick={() => eliminarDelCarrito(item.id)}
                      className="text-red-300 hover:text-red-500 font-bold text-lg leading-none px-1"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
              
              <div className="flex justify-between items-center mt-2 pt-2 font-bold text-lg text-[#4A4A4A]">
                <span>Total:</span>
                <span>${totalCarrito}</span>
              </div>
              
              <Button 
                className="w-full mt-3 bg-[#6D6875] text-white shadow-md hover:bg-[#4A4A4A]"
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