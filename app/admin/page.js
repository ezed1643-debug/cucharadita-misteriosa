"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../lib/firebase"; 
import { Card, CardBody, Input, Button, Divider, Textarea, Tabs, Tab } from "@nextui-org/react";

export default function AdminPanel() {
  // ESTADOS DE PRODUCTOS
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [stock, setStock] = useState("");
  const [categoria, setCategoria] = useState("");
  const [imagen, setImagen] = useState(null); 
  const [imagenUrlActual, setImagenUrlActual] = useState(""); 
  const [productos, setProductos] = useState([]);
  const [editandoId, setEditandoId] = useState(null);

  // ESTADOS DE VENTAS
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(false);

  const categoriasExistentes = Array.from(new Set(productos.map(p => p.categoria).filter(c => c)));

  // CARGAR TODO AL INICIAR
  const cargarDatos = async () => {
    try {
      // Cargar Productos
      const qProd = query(collection(db, "productos"), orderBy("nombre", "asc"));
      const resProd = await getDocs(qProd);
      setProductos(resProd.docs.map(d => ({ id: d.id, ...d.data() })));

      // Cargar Ventas (Las más recientes primero)
      const qVentas = query(collection(db, "pedidos"), orderBy("fecha", "desc"));
      const resVentas = await getDocs(qVentas);
      setVentas(resVentas.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  };

  useEffect(() => { cargarDatos(); }, []);

  // LÓGICA DE PRODUCTOS (Resumida para brevedad, mantiene tu funcionalidad)
  const guardarProducto = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      let url = imagenUrlActual;
      if (imagen) {
        const imageRef = ref(storage, `fotos_productos/${Date.now()}_${imagen.name}`);
        await uploadBytes(imageRef, imagen);
        url = await getDownloadURL(imageRef);
      }
      const data = { nombre, descripcion, categoria, precio: Number(precio), stock: Number(stock), imagenUrl: url };
      if (editandoId) await updateDoc(doc(db, "productos", editandoId), data);
      else await addDoc(collection(db, "productos"), data);
      limpiarForm(); cargarDatos();
    } catch (e) { alert("Error al guardar"); }
    finally { setCargando(false); }
  };

  const limpiarForm = () => {
    setEditandoId(null); setNombre(""); setPrecio(""); setDescripcion(""); setStock(""); setCategoria(""); setImagenUrlActual(""); setImagen(null);
  };

  // LÓGICA DE WHATSAPP PARA VENTAS
  const contactarCliente = (venta) => {
    const texto = `Hola ${venta.cliente.nombre}, soy de Cucharadita Misteriosa. Recibimos tu pago por el pedido: ${venta.items.map(i => i.nombre).join(", ")}. ¡Muchas gracias!`;
    window.open(`https://wa.me/${venta.cliente.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(texto)}`, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-10">
      <h1 className="text-4xl font-serif text-[#B5838D] mb-8 text-center italic">Centro de Gestión</h1>

      <Tabs aria-label="Opciones" color="secondary" variant="underlined" classNames={{ tabList: "gap-6", cursor: "w-full bg-[#B5838D]", tab: "max-w-fit px-0 h-12" }}>
        
        {/* PESTAÑA 1: GESTIÓN DE PRODUCTOS */}
        <Tab key="productos" title="PRODUCTOS e INVENTARIO">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
            <Card className="p-4 border border-[#FCD5CE] h-fit">
              <form onSubmit={guardarProducto} className="flex flex-col gap-4">
                <h2 className="text-xl font-bold text-[#4A4A4A]">{editandoId ? "Editar" : "Nuevo"} Producto</h2>
                <Input label="Nombre" value={nombre} onValueChange={setNombre} isRequired />
                <Input label="Precio" type="number" value={precio} onValueChange={setPrecio} isRequired />
                <Input label="Categoría" value={categoria} onValueChange={setCategoria} placeholder="Escribe o elige abajo" />
                <Textarea label="Descripción" value={descripcion} onValueChange={setDescripcion} />
                <Input label="Stock" type="number" value={stock} onValueChange={setStock} isRequired />
                <input type="file" onChange={(e) => setImagen(e.target.files[0])} className="text-sm" />
                <Button type="submit" isLoading={cargando} className="bg-[#6D6875] text-white">Guardar Producto</Button>
              </form>
            </Card>

            <div className="flex flex-col gap-4">
              {productos.map(p => (
                <Card key={p.id} className="p-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <img src={p.imagenUrl} className="w-12 h-12 object-cover rounded" />
                      <div>
                        <p className="font-bold text-sm">{p.nombre}</p>
                        <p className="text-xs text-[#B5838D]">Stock: {p.stock}</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => { setEditandoId(p.id); setNombre(p.nombre); setPrecio(p.precio); setStock(p.stock); setCategoria(p.categoria); setDescripcion(p.descripcion); setImagenUrlActual(p.imagenUrl); }}>Editar</Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </Tab>

        {/* PESTAÑA 2: VENTAS RECIBIDAS */}
        <Tab key="ventas" title="VENTAS RECIBIDAS">
          <div className="flex flex-col gap-6 mt-6">
            {ventas.length === 0 ? (
              <p className="text-center text-gray-400 py-20">Aún no has recibido ventas por la web.</p>
            ) : (
              ventas.map((v) => (
                <Card key={v.id} className="border-l-4 border-l-[#B5838D] p-5">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-[#FCF9F6] px-2 py-1 rounded text-[10px] font-bold text-gray-400">
                          {new Date(v.fecha?.seconds * 1000).toLocaleDateString()}
                        </span>
                        <span className="text-green-600 font-bold text-sm">PAGO CONFIRMADO</span>
                      </div>
                      <h3 className="text-lg font-bold text-[#4A4A4A]">{v.cliente.nombre}</h3>
                      <p className="text-sm text-gray-500 mb-3">WhatsApp: {v.cliente.whatsapp}</p>
                      
                      <div className="bg-[#FCF9F6] p-3 rounded-lg">
                        <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Pedido:</p>
                        {v.items?.map((item, idx) => (
                          <p key={idx} className="text-sm text-[#6D6875]">• {item.nombre} (x{item.cantidad})</p>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col justify-between items-end">
                      <div className="text-right">
                        <p className="text-xs text-gray-400 uppercase">Total Cobrado</p>
                        <p className="text-2xl font-bold text-[#B5838D]">${v.total}</p>
                      </div>
                      <Button 
                        className="bg-[#25D366] text-white font-bold"
                        onClick={() => contactarCliente(v)}
                      >
                        Enviar WhatsApp
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </Tab>
      </Tabs>
    </div>
  );
}