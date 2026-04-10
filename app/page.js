"use client";
import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase"; 
import { Card, CardBody, CardFooter, Image, Button, RadioGroup, Radio, Input } from "@nextui-org/react";
import { Playfair_Display } from 'next/font/google';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '600', '700'], style: ['italic', 'normal'] });

export default function Home() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [cargandoPagos, setCargandoPagos] = useState(false);
  const [compraFinalizada, setCompraFinalizada] = useState(false); 
  const [ordenId, setOrdenId] = useState(""); 
  
  // NUEVO: Estado para la categoría seleccionada
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("Todas");
  
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  
  const [metodoEntrega, setMetodoEntrega] = useState("retiro");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [costoEnvio, setCostoEnvio] = useState(0);

  useEffect(() => {
    const obtenerProductos = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "productos"));
        const docs = [];
        querySnapshot.forEach((doc) => docs.push({ id: doc.id, ...doc.data() }));
        docs.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
        setProductos(docs);
      } catch (error) { console.error(error); }
    };
    obtenerProductos();
  }, []);

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
    if (item) setCarrito(carrito.map((i) => i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i));
    else setCarrito([...carrito, { ...producto, cantidad: 1 }]);
  };

  const eliminarDelCarrito = (id) => setCarrito(carrito.filter((i) => i.id !== id));

  const totalProductos = carrito.reduce((t, i) => t + (Number(i.precio) * i.cantidad), 0);
  const totalFinal = totalProductos + costoEnvio;

  const finalizarCompra = async () => {
    if (!nombre || !apellido || !whatsapp) {
      alert("Por favor, completa tus datos de contacto.");
      return;
    }
    if (metodoEntrega === "envio" && !codigoPostal) {
      alert("Por favor, ingresa tu Código Postal.");
      return;
    }

    setCargandoPagos(true);

    try {
      const nuevoPedidoRef = await addDoc(collection(db, "pedidos"), {
        cliente: { nombre: `${nombre} ${apellido}`, whatsapp, metodoEntrega, codigoPostal: codigoPostal || "N/A" },
        items: carrito.map(i => ({ nombre: i.nombre, cantidad: i.cantidad, precio: i.precio })),
        total: totalFinal,
        fecha: serverTimestamp(),
        estado: "Pendiente de Pago" 
      });

      setOrdenId(nuevoPedidoRef.id.substring(0, 6).toUpperCase());
      setCompraFinalizada(true);

    } catch (error) {
      console.error("Error:", error);
      alert("Hubo un error al procesar el pedido.");
    } finally {
      setCargandoPagos(false);
    }
  };

  const enviarComprobanteWA = () => {
    const mensaje = `¡Hola! Acabo de hacer el pedido *#${ordenId}* en Cucharadita Misteriosa por un total de *$${totalFinal}*. Te adjunto el comprobante de transferencia a tu cuenta.`;
    window.open(`https://wa.me/5493436575042?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  // NUEVO: Extraemos las categorías únicas de los productos para armar los botones
  const categoriasExisten = ["Todas", ...Array.from(new Set(productos.map(p => p.categoria).filter(Boolean)))];
  
  // NUEVO: Filtramos los productos según la categoría tocada
  const productosFiltrados = categoriaSeleccionada === "Todas" 
    ? productos 
    : productos.filter(p => p.categoria === categoriaSeleccionada);

  // NUEVO: Función para deslizar suavemente hacia el carrito
  const irAlCarrito = () => {
    document.getElementById("carrito-seccion")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-3 sm:p-6 md:p-12 relative">
      
      {/* BOTÓN FLOTANTE CARRITO (Visible solo en celular/tablet cuando hay productos) */}
      {carrito.length > 0 && !compraFinalizada && (
        <div className="fixed bottom-6 right-6 z-50 lg:hidden animate-appearance-in">
          <Button 
            radius="full" 
            size="lg" 
            className="bg-[#6D6875] text-white shadow-2xl border-2 border-white px-6 font-bold text-md"
            onClick={irAlCarrito}
          >
            🛒 Ver Carrito ({carrito.reduce((t, i) => t + i.cantidad, 0)})
          </Button>
        </div>
      )}

      <div className="w-full max-w-7xl mb-12 text-center mt-4 px-4">
        <h1 className={`${playfair.className} text-5xl sm:text-7xl font-bold mb-4 text-[#B5838D] italic`}>Cucharadita Misteriosa</h1>
        <p className="text-xl sm:text-2xl font-bold text-[#4A4A4A] mb-2 uppercase tracking-wide">Descubre tu esencia</p>
        <p className="text-sm sm:text-lg font-light text-[#6D6875] max-w-2xl mx-auto">Maquillaje, cuidado personal y artículos de belleza seleccionados para resaltar tu luz.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl">
        
        {/* SECCIÓN CATÁLOGO */}
        <div className="flex-1">
          
          {/* NUEVO: BOTONERA DE FILTROS POR CATEGORÍA */}
          <div className="flex flex-wrap gap-2 mb-6 border-b border-[#FCD5CE] pb-4">
            {categoriasExisten.map(cat => (
              <Button
                key={cat}
                size="sm"
                radius="full"
                variant={categoriaSeleccionada === cat ? "solid" : "flat"}
                className={`font-bold text-xs tracking-wider transition-all ${
                  categoriaSeleccionada === cat 
                    ? "bg-[#B5838D] text-white shadow-md" 
                    : "bg-[#FCF9F6] text-[#6D6875] hover:bg-[#E5989B] hover:text-white"
                }`}
                onClick={() => setCategoriaSeleccionada(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
            {productosFiltrados.length === 0 ? (
              <p className="col-span-full text-center py-10 text-gray-400 italic">No hay productos en esta categoría.</p>
            ) : (
              productosFiltrados.map((prod) => {
                const cantCarrito = carrito.find(i => i.id === prod.id)?.cantidad || 0;
                const sinStock = prod.stock === 0 || cantCarrito >= prod.stock;
                return (
                  <Card key={prod.id} shadow="sm" className="bg-white border-none">
                    <CardBody className="p-0 relative">
                      {prod.categoria && (
                        <span className="absolute top-2 left-2 z-10 px-2 py-1 text-[8px] sm:text-[10px] font-bold text-white bg-[#B5838D]/90 backdrop-blur-sm rounded-full uppercase shadow-sm">
                          {prod.categoria}
                        </span>
                      )}
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
              })
            )}
          </div>
        </div>

        {/* CARRITO Y PANTALLA DE PAGO (Agregamos el id="carrito-seccion") */}
        <div id="carrito-seccion" className="w-full lg:w-96 h-fit sticky top-6 bg-white p-6 rounded-2xl shadow-sm border border-[#FCD5CE] scroll-mt-6">
          
          {compraFinalizada ? (
            <div className="flex flex-col items-center text-center gap-4 animate-appearance-in">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mb-2">✓</div>
              <h2 className={`${playfair.className} text-2xl text-[#4A4A4A] font-bold`}>¡Pedido Registrado!</h2>
              <p className="text-sm text-[#6D6875]">Tu número de orden es: <b className="text-[#B5838D]">#{ordenId}</b></p>
              
              <div className="w-full bg-[#FCF9F6] p-4 rounded-xl border border-[#FCD5CE] mt-2">
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Datos para pagar</p>
                <p className="text-lg text-[#4A4A4A]">Total a transferir:</p>
                <p className="text-3xl font-bold text-[#B5838D] my-1">${totalFinal}</p>
                <div className="mt-4 text-left border-t border-gray-200 pt-3">
                  <p className="text-sm text-gray-600"><b>Alias:</b> belengutierrez.25 </p>
                  <p className="text-sm text-gray-600"><b>A nombre de:</b> María Belen Gutierrez </p>
                </div>
              </div>

              <p className="text-xs text-gray-400 italic px-2 mt-2">
                Realiza la transferencia desde tu cuenta y envíanos el comprobante por WhatsApp para confirmar tu compra.
              </p>

              <Button 
                className="w-full mt-2 bg-[#25D366] text-white font-bold h-12 shadow-lg"
                onClick={enviarComprobanteWA}
              >
                Enviar Comprobante
              </Button>
            </div>
          ) : (
            <>
              <h2 className={`${playfair.className} text-2xl mb-6 text-[#B5838D]`}>Tu Compra</h2>
              {carrito.length === 0 ? (
                <p className="text-gray-400 text-center py-8 text-sm italic">El carrito está vacío.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {carrito.map((item) => (
                    <div key={item.id} className="flex justify-between items-center border-b pb-2">
                      <span className="text-sm font-medium w-2/3 truncate">{item.nombre} (x{item.cantidad})</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#4A4A4A]">${item.precio * item.cantidad}</span>
                        <button onClick={() => eliminarDelCarrito(item.id)} className="text-red-300 font-bold text-lg">×</button>
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-col gap-3 mt-2 p-3 bg-[#FCF9F6] rounded-xl border border-[#FCD5CE]">
                    <p className="text-[10px] font-bold text-[#6D6875] uppercase tracking-widest">Tus Datos</p>
                    <Input size="sm" variant="underlined" label="Nombre" value={nombre} onValueChange={setNombre} />
                    <Input size="sm" variant="underlined" label="Apellido" value={apellido} onValueChange={setApellido} />
                    <Input size="sm" variant="underlined" label="WhatsApp" placeholder="Ej: 3436575042" value={whatsapp} onValueChange={setWhatsapp} />
                  </div>

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
                    CONTINUAR PAGO
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}