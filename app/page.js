"use client";
import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase"; 
import { 
  Card, CardBody, CardFooter, Image, Button, RadioGroup, Radio, Input,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Divider 
} from "@nextui-org/react";
import { Playfair_Display } from 'next/font/google';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '600', '700'], style: ['italic', 'normal'] });

export default function Home() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [cargandoPagos, setCargandoPagos] = useState(false);
  const [compraFinalizada, setCompraFinalizada] = useState(false); 
  const [ordenId, setOrdenId] = useState(""); 
  
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("Todas");
  const [productoEnDetalle, setProductoEnDetalle] = useState(null); 
  const {isOpen, onOpen, onOpenChange} = useDisclosure(); 

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
    } catch (error) { console.error(error); }
    finally { setCargandoPagos(false); }
  };

  const enviarComprobanteWA = () => {
    const mensaje = `¡Hola! Acabo de hacer el pedido *#${ordenId}* en Cucharadita Misteriosa por un total de *$${totalFinal}*. Te adjunto el comprobante.`;
    window.open(`https://wa.me/5493436575042?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  const categoriasExisten = ["Todas", ...Array.from(new Set(productos.map(p => p.categoria).filter(Boolean)))];
  const productosFiltrados = categoriaSeleccionada === "Todas" ? productos : productos.filter(p => p.categoria === categoriaSeleccionada);

  const irAlCarrito = () => { document.getElementById("carrito-seccion")?.scrollIntoView({ behavior: "smooth" }); };

  const verDetalle = (producto) => {
    setProductoEnDetalle(producto);
    onOpen();
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-3 sm:p-6 md:p-12 relative">
      
      {carrito.length > 0 && !compraFinalizada && (
        <div className="fixed bottom-6 right-6 z-50 lg:hidden animate-appearance-in">
          <Button radius="full" size="lg" className="bg-[#6D6875] text-white shadow-2xl border-2 border-white px-6 font-bold" onClick={irAlCarrito}>
            🛒 Carrito ({carrito.reduce((t, i) => t + i.cantidad, 0)})
          </Button>
        </div>
      )}

      <div className="w-full max-w-7xl mb-12 text-center mt-4">
        <h1 className={`${playfair.className} text-5xl sm:text-7xl font-bold mb-4 text-[#B5838D] italic`}>Cucharadita Misteriosa</h1>
        <p className="text-xl sm:text-2xl font-bold text-[#4A4A4A] mb-2 uppercase tracking-wide">Descubre tu esencia</p>
        <p className="text-sm sm:text-lg font-light text-[#6D6875] max-w-2xl mx-auto italic">Maquillaje y artículos de belleza seleccionados para resaltar tu luz.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl">
        <div className="flex-1">
          <div className="flex flex-wrap gap-2 mb-6 border-b border-[#FCD5CE] pb-4">
            {categoriasExisten.map(cat => (
              <Button key={cat} size="sm" radius="full" variant={categoriaSeleccionada === cat ? "solid" : "flat"}
                className={`font-bold text-xs ${categoriaSeleccionada === cat ? "bg-[#B5838D] text-white" : "bg-white text-[#6D6875]"}`}
                onClick={() => setCategoriaSeleccionada(cat)}
              > {cat} </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
            {productosFiltrados.map((prod) => {
              const cantCarrito = carrito.find(i => i.id === prod.id)?.cantidad || 0;
              const sinStock = prod.stock === 0 || cantCarrito >= prod.stock;
              return (
                <Card key={prod.id} shadow="sm" className="bg-white border-none cursor-pointer" isPressable onClick={() => verDetalle(prod)}>
                  <CardBody className="p-0 relative">
                    <Image shadow="none" radius="none" width="100%" className="w-full object-cover h-[160px] sm:h-[250px]" src={prod.imagenUrl} />
                  </CardBody>
                  <CardFooter className="flex-col items-start p-3 sm:p-5">
                    <b className="text-xs sm:text-md uppercase truncate w-full">{prod.nombre}</b>
                    <p className="text-[#B5838D] font-semibold">${prod.precio}</p>
                    <Button size="sm" className={`w-full mt-2 text-white font-bold ${sinStock ? 'bg-red-600' : 'bg-[#E5989B]'}`} 
                      onClick={(e) => { e.stopPropagation(); agregarAlCarrito(prod); }} isDisabled={sinStock}>
                      {sinStock ? "AGOTADO!" : "Añadir"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>

        <div id="carrito-seccion" className="w-full lg:w-96 h-fit sticky top-6 bg-white p-6 rounded-2xl shadow-sm border border-[#FCD5CE]">
          {compraFinalizada ? (
            <div className="flex flex-col items-center text-center gap-4">
              <h2 className={`${playfair.className} text-2xl text-[#4A4A4A] font-bold`}>¡Pedido Registrado!</h2>
              <p className="text-sm">Orden: <b className="text-[#B5838D]">#{ordenId}</b></p>
              <div className="w-full bg-[#FCF9F6] p-4 rounded-xl border border-[#FCD5CE]">
                <p className="text-3xl font-bold text-[#B5838D] mb-4">${totalFinal}</p>
                <p className="text-sm text-gray-600"><b>Alias MP:</b> cucharadita.mp</p>
                <p className="text-sm text-gray-600"><b>Titular:</b> [Tu Nombre]</p>
              </div>
              <Button className="w-full bg-[#25D366] text-white font-bold" onClick={enviarComprobanteWA}>Enviar Comprobante</Button>
            </div>
          ) : (
            <>
              <h2 className={`${playfair.className} text-2xl mb-6 text-[#B5838D]`}>Tu Compra</h2>
              {carrito.length === 0 ? <p className="text-gray-400 text-center py-8 italic">El carrito está vacío.</p> : (
                <div className="flex flex-col gap-4">
                  {carrito.map((item) => (
                    <div key={item.id} className="flex justify-between items-center border-b pb-2">
                      <span className="text-sm font-medium w-2/3 truncate">{item.nombre} (x{item.cantidad})</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">${item.precio * item.cantidad}</span>
                        <button onClick={() => eliminarDelCarrito(item.id)} className="text-red-300 font-bold text-lg">×</button>
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-col gap-3 p-3 bg-[#FCF9F6] rounded-xl border border-[#FCD5CE]">
                    <Input size="sm" variant="underlined" label="Nombre" value={nombre} onValueChange={setNombre} />
                    <Input size="sm" variant="underlined" label="Apellido" value={apellido} onValueChange={setApellido} />
                    <Input size="sm" variant="underlined" label="WhatsApp" placeholder="Ej: 3436575042" value={whatsapp} onValueChange={setWhatsapp} />
                  </div>
                  <div className="p-3">
                    <RadioGroup value={metodoEntrega} onValueChange={setMetodoEntrega} size="sm">
                      <Radio value="retiro">Retiro en Victoria</Radio>
                      <Radio value="envio">Envío a domicilio</Radio>
                    </RadioGroup>
                    {metodoEntrega === "envio" && (
                      <Input size="sm" label="Código Postal" className="mt-3 max-w-[120px]" value={codigoPostal} onValueChange={setCodigoPostal} />
                    )}
                  </div>
                  <div className="flex justify-between font-bold text-2xl text-[#4A4A4A] border-t pt-4">
                    <span>TOTAL:</span><span>${totalFinal}</span>
                  </div>
                  <Button className="w-full mt-4 bg-[#6D6875] text-white font-bold h-14" isLoading={cargandoPagos} onClick={finalizarCompra}>CONFIRMAR PEDIDO</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl" scrollBehavior="inside" backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className={`${playfair.className} text-2xl text-[#B5838D]`}>{productoEnDetalle?.nombre}</ModalHeader>
              <ModalBody>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-full md:w-1/2">
                    <Image src={productoEnDetalle?.imagenUrl} className="w-full object-cover rounded-xl shadow-lg" />
                  </div>
                  <div className="w-full md:w-1/2 flex flex-col gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-white bg-[#B5838D] px-2 py-1 rounded-full uppercase tracking-widest">{productoEnDetalle?.categoria}</span>
                      <h3 className="text-3xl font-bold text-[#4A4A4A] mt-2">${productoEnDetalle?.precio}</h3>
                    </div>
                    
                    <Divider />
                    
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Descripción</p>
                      <p className="text-[#6D6875] leading-relaxed whitespace-pre-wrap">
                        {productoEnDetalle?.descripcion || "Este producto no tiene una descripción detallada todavía."}
                      </p>
                    </div>

                    <div className="mt-auto pt-4">
                       <p className="text-xs text-gray-400 mb-2">Stock disponible: {productoEnDetalle?.stock} unidades</p>
                       <Button 
                        className="w-full bg-[#E5989B] text-white font-bold py-6 text-lg"
                        isDisabled={productoEnDetalle?.stock === 0}
                        onClick={() => { agregarAlCarrito(productoEnDetalle); onClose(); }}
                       >
                         {productoEnDetalle?.stock === 0 ? "Agotado" : "Añadir al carrito"}
                       </Button>
                    </div>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose} className="font-bold text-gray-400">Cerrar</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

    </main>
  );
}