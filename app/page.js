"use client";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase"; 
import { Card, CardBody, CardFooter, Image, Button, RadioGroup, Radio, Input } from "@nextui-org/react";
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
  
  const [metodoEntrega, setMetodoEntrega] = useState("retiro");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [costoEnvio, setCostoEnvio] = useState(0);

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

  // Lógica de Envío: Victoria $1000 / Resto (Correo Argentino est.) $5500
  useEffect(() => {
    if (metodoEntrega === "envio") {
      if (codigoPostal === "3153") {
        setCostoEnvio(1000); 
      } else if (codigoPostal.length >= 4) {
        setCostoEnvio(5500); // Tarifa plana estimada Correo Argentino
      } else {
        setCostoEnvio(0);
      }
    } else {
      setCostoEnvio(0);
    }
  }, [metodoEntrega, codigoPostal]);

  const agregarAlCarrito = (producto) => {
    const itemEnCarrito = carrito.find((item) => item.id === producto.id);
    const cantidadActual = itemEnCarrito ? itemEnCarrito.cantidad : 0;
    if (cantidadActual >= producto.stock) return;

    if (itemEnCarrito) {
      setCarrito(carrito.map((item) => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
    }
  };

  const eliminarDelCarrito = (idAEliminar) => {
    setCarrito(carrito.filter((item) => item.id !== idAEliminar));
  };

  const totalProductos = carrito.reduce((total, item) => total + (Number(item.precio) * item.cantidad), 0);
  const totalFinal = totalProductos + costoEnvio;

  return (
    <main className="flex min-h-screen flex-col items-center p-3 sm:p-6 md:p-12">
      
      {/* CABECERA CON TIPOGRAFÍA ELEGANTE Y SUBTÍTULOS DIFERENCIADOS */}
      <div className="w-full max-w-7xl mb-8 md:mb-12 text-center mt-4 px-4">
      {/* Título Principal */}
       <h1 className={`${playfair.className} text-5xl sm:text-6xl md:text-7xl font-bold mb-4 text-[#B5838D] italic tracking-tight`}>
      Cucharadita Misteriosa
      </h1>

      {/* Frase de impacto: Mediana y Negrita */}
      <p className="text-xl sm:text-2xl font-bold text-[#4A4A4A] mb-2 tracking-wide uppercase">
        Descubre tu esencia
      </p>

      {/* Descripción: Ligera y clara */}
      <p className="text-sm sm:text-base md:text-lg font-light max-w-2xl mx-auto text-[#6D6875] leading-relaxed">
       Maquillaje, cuidado personal y artículos de belleza seleccionados para resaltar tu luz.
      </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl">
        
        {/* CATÁLOGO CON AVISOS DE STOCK */}
        <div className="flex-1">
          <h2 className={`${playfair.className} text-2xl mb-6 text-[#4A4A4A] border-b pb-2`}>Catálogo</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
            {productos.map((prod) => {
              const cantidadEnCarrito = carrito.find(i => i.id === prod.id)?.cantidad || 0;
              const stockDisponibleReal = prod.stock - cantidadEnCarrito;
              const sinStock = prod.stock === 0 || stockDisponibleReal <= 0;

              return (
                <Card key={prod.id} shadow="sm" className="bg-white border-none">
                  <CardBody className="p-0 relative">
                    <Image shadow="none" radius="none" width="100%" className="w-full object-cover h-[160px] sm:h-[250px]" src={prod.imagenUrl} />
                  </CardBody>
                  <CardFooter className="flex-col items-start p-3 sm:p-5">
                    <b className="text-xs sm:text-md uppercase truncate w-full">{prod.nombre}</b>
                    
                    <div className="flex justify-between items-center w-full mt-1">
                      <p className="text-[#B5838D] font-semibold">${prod.precio}</p>
                      
                      {/* AVISOS DE STOCK DINÁMICOS */}
                      {!sinStock && stockDisponibleReal <= 2 && (
                        <span className="text-[10px] font-bold text-orange-500 animate-pulse">
                          ¡ÚLTIMOS {stockDisponibleReal}!
                        </span>
                      )}
                    </div>

                    <Button 
                      size="sm"
                      className={`w-full mt-2 text-white font-bold transition-colors ${
                        sinStock ? 'bg-red-600 !opacity-100' : 'bg-[#E5989B] hover:bg-[#B5838D]'
                      }`} 
                      onClick={() => agregarAlCarrito(prod)}
                      isDisabled={sinStock}
                    >
                      {sinStock ? "AGOTADO!" : "Añadir"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>

        {/* CARRITO Y LOGÍSTICA */}
        <div className="w-full lg:w-96 h-fit sticky top-6 bg-white p-6 rounded-2xl shadow-sm border border-[#FCD5CE]">
          <h2 className={`${playfair.className} text-2xl mb-6 text-[#B5838D]`}>Tu Compra</h2>
          
          {carrito.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm italic">El carrito está vacío.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {carrito.map((item) => (
                <div key={item.id} className="flex justify-between items-center border-b pb-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{item.nombre}</span>
                    <span className="text-xs text-[#B5838D]">Cant: {item.cantidad}</span>
                  </div>
                  <button onClick={() => eliminarDelCarrito(item.id)} className="text-red-300 font-bold">×</button>
                </div>
              ))}

              <div className="bg-[#FCF9F6] p-4 rounded-xl mt-2 border border-[#FCD5CE]">
                <p className="text-sm font-bold text-[#4A4A4A] mb-3 uppercase tracking-tighter">Entrega</p>
                <RadioGroup value={metodoEntrega} onValueChange={setMetodoEntrega} color="secondary">
                  <Radio value="retiro" className="text-xs">Retiro en Victoria (Gratis)</Radio>
                  <Radio value="envio" className="text-xs">Envío a domicilio</Radio>
                </RadioGroup>

                {metodoEntrega === "envio" && (
                  <div className="mt-4">
                    <Input 
                      size="sm" 
                      label="Código Postal" 
                      placeholder="Ej: 3153" 
                      value={codigoPostal} 
                      onValueChange={setCodigoPostal}
                      className="max-w-[150px]"
                    />
                    {codigoPostal && (
                      <p className="text-[11px] text-[#B5838D] mt-2 font-bold italic">
                        {codigoPostal === "3153" 
                          ? "Tarifa Local Victoria: $1.000" 
                          : "Correo Argentino (Estandar): $5.500"}
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="mt-2 pt-2 border-t border-dashed">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Subtotal:</span>
                  <span>${totalProductos}</span>
                </div>
                {metodoEntrega === "envio" && (
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Envío:</span>
                    <span>${costoEnvio}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xl text-[#4A4A4A] mt-2 border-t pt-2">
                  <span>TOTAL:</span>
                  <span>${totalFinal}</span>
                </div>
              </div>
              
              <Button 
                className="w-full mt-4 bg-[#6D6875] text-white font-bold h-12 shadow-lg"
                isLoading={setCargandoPagos === true}
                isDisabled={metodoEntrega === "envio" && !codigoPostal}
                onClick={() => alert("Redirigiendo a Mercado Pago...")}
              >
                {metodoEntrega === "envio" && !codigoPostal ? "INGRESA CP" : "PAGAR AHORA"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}