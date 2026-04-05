"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../lib/firebase"; 
import { Card, CardBody, Input, Button, Divider, Textarea, Tabs, Tab, Chip } from "@nextui-org/react";

// Componentes para los gráficos
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend 
} from 'recharts';

export default function AdminPanel() {
  // --- ESTADOS ---
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [datosGrafico, setDatosGrafico] = useState([]);
  const [datosCategorias, setDatosCategorias] = useState([]);
  const [totalGanancia, setTotalGanancia] = useState(0);
  const [cargando, setCargando] = useState(false);

  // Estados Formulario Producto
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [stock, setStock] = useState("");
  const [categoria, setCategoria] = useState("");
  const [imagen, setImagen] = useState(null); 
  const [imagenUrlActual, setImagenUrlActual] = useState(""); 
  const [editandoId, setEditandoId] = useState(null);

  const COLORES_TORTA = ['#B5838D', '#E5989B', '#6D6875', '#FFB4A2', '#FCD5CE'];

  const cargarDatos = async () => {
    try {
      const qProd = query(collection(db, "productos"), orderBy("nombre", "asc"));
      const resProd = await getDocs(qProd);
      setProductos(resProd.docs.map(d => ({ id: d.id, ...d.data() })));

      const qVentas = query(collection(db, "pedidos"), orderBy("fecha", "desc"));
      const resVentas = await getDocs(qVentas);
      const listaVentas = resVentas.docs.map(d => ({ id: d.id, ...d.data() }));
      setVentas(listaVentas);

      procesarEstadisticas(listaVentas);
    } catch (e) { console.error(e); }
  };

  const procesarEstadisticas = (lista) => {
    const ventasPorDia = {};
    const conteoCategorias = {};
    let acumulado = 0;

    lista.forEach(v => {
      if (!v.fecha) return;
      const fechaClave = new Date(v.fecha.seconds * 1000).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
      ventasPorDia[fechaClave] = (ventasPorDia[fechaClave] || 0) + v.total;
      acumulado += v.total;

      v.items?.forEach(item => {
        const cat = item.categoria || "Otros";
        conteoCategorias[cat] = (conteoCategorias[cat] || 0) + item.cantidad;
      });
    });

    setDatosGrafico(Object.keys(ventasPorDia).map(fecha => ({ name: fecha, ganancia: ventasPorDia[fecha] })).reverse().slice(-7));
    setDatosCategorias(Object.keys(conteoCategorias).map(cat => ({ name: cat, value: conteoCategorias[cat] })));
    setTotalGanancia(acumulado);
  };

  useEffect(() => { cargarDatos(); }, []);

  // --- LÓGICA DE ESTADO DE PEDIDOS (NUEVA) ---
  const cambiarEstadoPedido = async (id, estadoActual) => {
    const nuevoEstado = estadoActual === "Entregado" ? "Pendiente" : "Entregado";
    try {
      await updateDoc(doc(db, "pedidos", id), { estado: nuevoEstado });
      cargarDatos(); // Recargamos para ver el cambio
    } catch (e) {
      console.error("Error al actualizar estado:", e);
    }
  };

  // --- LÓGICA PRODUCTOS ---
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
      const data = { nombre, descripcion, categoria, precio: Number(precio), stock: Number(stock), imagenUrl: url || "https://via.placeholder.com/250" };
      if (editandoId) await updateDoc(doc(db, "productos", editandoId), data);
      else await addDoc(collection(db, "productos"), data);
      limpiarForm(); cargarDatos();
    } catch (e) { alert("Error"); }
    finally { setCargando(false); }
  };

  const limpiarForm = () => { setEditandoId(null); setNombre(""); setPrecio(""); setDescripcion(""); setStock(""); setCategoria(""); setImagenUrlActual(""); setImagen(null); };

  const contactarCliente = (venta) => {
    const msg = `Hola ${venta.cliente.nombre}, ¡gracias por tu compra en Cucharadita Misteriosa! Recibimos tu pedido de: ${venta.items.map(i => i.nombre).join(", ")}.`;
    window.open(`https://wa.me/${venta.cliente.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10 bg-[#FCF9F6] min-h-screen">
      <h1 className="text-4xl font-serif text-[#B5838D] mb-8 text-center italic font-bold">Panel Administrativo</h1>

      <Tabs aria-label="Menu" color="secondary" variant="underlined" fullWidth size="lg">
        
        {/* REPORTES */}
        <Tab key="reportes" title="📊 REPORTES">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 mb-8">
            <Card className="bg-[#B5838D] text-white p-6 shadow-sm">
              <p className="text-xs uppercase font-bold opacity-80">Ganancia Total</p>
              <h2 className="text-4xl font-bold">${totalGanancia.toLocaleString()}</h2>
            </Card>
            <Card className="bg-[#6D6875] text-white p-6 shadow-sm">
              <p className="text-xs uppercase font-bold opacity-80">Ventas</p>
              <h2 className="text-4xl font-bold">{ventas.length}</h2>
            </Card>
            <Card className="bg-[#E5989B] text-white p-6 shadow-sm">
              <p className="text-xs uppercase font-bold opacity-80">Ticket Promedio</p>
              <h2 className="text-4xl font-bold">${ventas.length > 0 ? (totalGanancia / ventas.length).toFixed(0) : 0}</h2>
            </Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="p-6 bg-white shadow-sm"><h3 className="mb-4 font-bold">Ventas Diarias</h3>
              <div className="h-[250px]"><ResponsiveContainer><BarChart data={datosGrafico}><XAxis dataKey="name"/><Tooltip/><Bar dataKey="ganancia" fill="#B5838D" radius={[4, 4, 0, 0]}/></BarChart></ResponsiveContainer></div>
            </Card>
            <Card className="p-6 bg-white shadow-sm"><h3 className="mb-4 font-bold">Categorías</h3>
              <div className="h-[250px]"><ResponsiveContainer><PieChart><Pie data={datosCategorias} innerRadius={60} outerRadius={80} dataKey="value">{datosCategorias.map((e, i) => <Cell key={i} fill={COLORES_TORTA[i % COLORES_TORTA.length]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer></div>
            </Card>
          </div>
        </Tab>

        {/* VENTAS (CON GESTIÓN DE ESTADOS) */}
        <Tab key="ventas" title="🛒 VENTAS">
          <div className="flex flex-col gap-6 mt-6">
            {ventas.map((v) => (
              <Card key={v.id} className={`p-5 shadow-sm transition-opacity ${v.estado === "Entregado" ? "opacity-60 grayscale-[0.5]" : "opacity-100"}`}>
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {v.fecha ? new Date(v.fecha.seconds * 1000).toLocaleDateString() : 'Procesando...'}
                      </span>
                      {/* ETIQUETA DE ESTADO */}
                      <Chip 
                        size="sm" 
                        variant="flat" 
                        color={v.estado === "Entregado" ? "success" : "warning"}
                        className="font-bold text-[10px] uppercase"
                      >
                        {v.estado === "Entregado" ? "✓ Entregado" : "● Pendiente"}
                      </Chip>
                    </div>
                    <h3 className="text-xl font-bold text-[#4A4A4A]">{v.cliente?.nombre}</h3>
                    <div className="bg-[#FCF9F6] p-3 rounded-lg mt-3 border border-[#FCD5CE]">
                      {v.items?.map((it, i) => <p key={i} className="text-sm text-[#6D6875]">• {it.nombre} (x{it.cantidad})</p>)}
                    </div>
                  </div>
                  <div className="flex flex-col justify-between items-end gap-3">
                    <p className="text-2xl font-bold text-[#B5838D]">${v.total}</p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="bordered"
                        color={v.estado === "Entregado" ? "default" : "success"}
                        className="font-bold"
                        onClick={() => cambiarEstadoPedido(v.id, v.estado)}
                      >
                        {v.estado === "Entregado" ? "Revertir a Pendiente" : "Marcar como Listo"}
                      </Button>
                      <Button size="sm" className="bg-[#25D366] text-white font-bold" onClick={() => contactarCliente(v)}>WhatsApp</Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Tab>

        {/* INVENTARIO */}
        <Tab key="productos" title="💄 INVENTARIO">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
            <Card className="p-6 bg-white shadow-sm h-fit">
              <form onSubmit={guardarProducto} className="flex flex-col gap-4">
                <Input label="Nombre" value={nombre} onValueChange={setNombre} isRequired />
                <Input label="Precio" type="number" value={precio} onValueChange={setPrecio} isRequired />
                <Input label="Stock" type="number" value={stock} onValueChange={setStock} isRequired />
                <Input label="Categoría" value={categoria} onValueChange={setCategoria} />
                <Textarea label="Descripción" value={descripcion} onValueChange={setDescripcion} />
                <input type="file" className="text-xs" onChange={(e) => setImagen(e.target.files[0])} />
                <Button type="submit" isLoading={cargando} className="bg-[#B5838D] text-white font-bold">{editandoId ? "Actualizar" : "Publicar"}</Button>
                {editandoId && <Button variant="light" size="sm" onClick={limpiarForm}>Cancelar</Button>}
              </form>
            </Card>
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[500px]">
              {productos.map(p => (
                <Card key={p.id} className="p-3 shadow-sm flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={p.imagenUrl} className="w-12 h-12 object-cover rounded" />
                    <div><p className="font-bold text-sm">{p.nombre}</p><p className="text-xs text-gray-400">Stock: {p.stock}</p></div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="flat" onClick={() => { setEditandoId(p.id); setNombre(p.nombre); setPrecio(p.precio.toString()); setStock(p.stock.toString()); setCategoria(p.categoria); setDescripcion(p.descripcion); setImagenUrlActual(p.imagenUrl); }}>Editar</Button>
                    <Button size="sm" color="danger" variant="flat" onClick={() => {if(confirm("¿Borrar?")) deleteDoc(doc(db, "productos", p.id)).then(cargarDatos)}}>X</Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </Tab>

      </Tabs>
    </div>
  );
}