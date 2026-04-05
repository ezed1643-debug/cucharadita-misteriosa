"use client";
import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
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
  
  // Datos del Cliente para el mini-formulario
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  
  // Logística
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
      } catch (error) { console.error(error); }
    };
    obtenerProductos();
  }, []);

  // Lógica de Envío Victoria $1000 / Correo Argentino Est. $5500
  useEffect(() => {
    if (metodoEntrega === "envio") {
      if (codigoPostal === "3153") setCostoEnvio(1000);
      else if (codigoPostal.length >= 4) setCostoEnvio(5500);
      else setCostoEnvio(0);
    } else { setCostoEnvio(0); }
  }, [metodoEntrega, codigoPostal]);

  const agregarAlCarrito = (producto) => {
    const item = carrito.find((i) => i.id === producto.id);
    if (item && item.cantidad >= producto.stock) return;
    if (item) {
      setCarrito(carrito.map((i) => i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i));
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
    }
  };

  const eliminarDelCarrito = (id) => setCarrito(carrito.filter((i) => i.id !== id));

  const totalProductos = carrito.reduce((t, i) => t + (Number(i.precio) * i.cantidad), 0);
  const totalFinal = totalProductos + costoEnvio;

  // FUNCIÓN MAESTRA: GUARDA PEDIDO Y PAGA
  const finalizarCompra = async () => {
    if (!nombre || !apellido || !whatsapp) {
      alert("Por favor, completa tus datos de contacto.");
      return;
    }

    setCargandoPagos(true);

    try {
      // 1. Guardamos el pedido en Firebase (Colección 'pedidos')
      // Esto es lo que verás en tu sección "Ventas Recibidas"
      await addDoc(collection(db, "pedidos"), {
        cliente: {
          nombre: `${nombre} ${apellido}`,
          whatsapp: whatsapp,
          metodoEntrega: metodoEntrega,
          codigoPostal: codigoPostal || "N/A"
        },
        items: carrito.map(i => ({ nombre: i.nombre, cantidad: i.cantidad, precio: i.precio })),
        total: totalFinal,
        fecha: serverTimestamp(),
        estado: "Pendiente de Pago"
      });

      // 2. Conectamos con Mercado Pago
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          carrito, 
          costoEnvio, 
          cliente: { nombre: `${nombre} ${apellido}`, whatsapp } 
        }), 
      });
      
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // Redirección final
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Hubo un error al procesar el pedido.");
    } finally {
      setCargandoPagos(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-3 sm:p-6 md:p-12">
      
      <div className="w-full max-w-7xl mb-12 text-center mt-4 px-4">
        <h1 className={`${playfair.className} text-5xl sm:text-7xl font-bold mb-4 text-[#B5838D] italic`}>Cucharadita Misteriosa</h1>
        <p className="text-xl sm:text-2xl font-bold text-[#4A4A4A] mb-2 uppercase tracking-wide">Descubre tu esencia</p>
        <p className="text-sm sm:text-lg font-light text-[#6D6875] max-w-2xl mx-auto">Maquillaje, cuidado personal y artículos de belleza seleccionados para resaltar tu luz.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl">
        {/* CATÁLOGO */}
        <div className="flex-1">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
            {productos.map((prod) => {
              const cantCarrito = carrito.find(i => i.id === prod.id)?.cantidad || 0;
              const sinStock = prod.stock === 0 || cantCarrito >= prod.stock;
              return (
                <Card key={prod.id} shadow="sm" className="bg-white border-none">
                  <CardBody className="p-0 relative">
                    <Image shadow="none" radius="none" width="100%" className="w-full object-cover h-[160px] sm:h-[250px]" src={prod.imagenUrl} />
                  </CardBody>
                  <CardFooter className="flex-col items-start p-3 sm:p-5">
                    <b className="text-xs sm:text-md uppercase truncate w-full">{prod.nombre}</b>
                    <p className="text-[#B5838D] font-semibold">${prod.precio}</p>
                    <Button size="sm" className={`w-full mt-2 text-white font-bold ${sinStock ? 'bg-red-600 !opacity-100' : 'bg-[#E5989B]'}`} onClick={() => agregarAlCarrito(prod)} isDisabled={sinStock}>
                      {sinStock ? "AGOTADO!" : "Añadir"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>

        {/* CARRITO CON FORMULARIO */}
        <div className="w-full lg:w-96 h-fit sticky top-6 bg-white p-6 rounded-2xl shadow-sm border border-[#FCD5CE]">
          <h2 className={`${playfair.className} text-2xl mb-6 text-[#B5838D]`}>Tu Compra</h2>
          
          {carrito.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm italic">El carrito está vacío.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Productos en el Carrito */}
              {carrito.map((item) => (
                <div key={item.id} className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm font-medium w-2/3 truncate">{item.nombre} (x{item.cantidad})</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#4A4A4A]">${item.precio * item.cantidad}</span>
                    <button onClick={() => eliminarDelCarrito(item.id)} className="text-red-300 font-bold text-lg">×</button>
                  </div>
                </div>
              ))}

              {/* MINI FORMULARIO DE CONTACTO */}
              <div className="flex flex-col gap-3 mt-2 p-3 bg-[#FCF9F6] rounded-xl border border-[#FCD5CE]">
                <p className="text-[10px] font-bold text-[#6D6875] uppercase tracking-widest">Tus Datos</p>
                <Input size="sm" variant="underlined" label="Nombre" value={nombre} onValueChange={setNombre} />
                <Input size="sm" variant="underlined" label="Apellido" value={apellido} onValueChange={setApellido} />
                <Input size="sm" variant="underlined" label="WhatsApp" placeholder="Ej: 3436" value={whatsapp} onValueChange={setWhatsapp} />
              </div>

              {/* OPCIONES DE ENVÍO */}
              <div className="p-3">
                <RadioGroup value={metodoEntrega} onValueChange={setMetodoEntrega} color="secondary" size="sm">
                  <Radio value="retiro">Retiro en Victoria</Radio>
                  <Radio value="envio">Envío a domicilio</Radio>
                </RadioGroup>
                {metodoEntrega === "envio" && (
                  <Input size="sm" label="Código Postal" className="mt-3 max-w-[120px]" value={codigoPostal} onValueChange={setCodigoPostal} />
                )}
              </div>
              
              <div className="border-t pt-4 mt-2">
                <div className="flex justify-between font-bold text-2xl text-[#4A4A4A]">
                  <span>TOTAL:</span>
                  <span>${totalFinal}</span>
                </div>
              </div>
              
              <Button 
                className="w-full mt-4 bg-[#6D6875] text-white font-bold h-14 shadow-xl text-lg"
                isLoading={cargandoPagos}
                onClick={finalizarCompra}
              >
                PAGAR AHORA
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}