"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../lib/firebase"; 
import { Card, CardBody, Input, Button, Divider, Textarea, Tabs, Tab } from "@nextui-org/react";

// Componentes para los gráficos profesionales
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend 
} from 'recharts';

export default function AdminPanel() {
  // --- ESTADOS DE PRODUCTOS (INVENTARIO) ---
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [stock, setStock] = useState("");
  const [categoria, setCategoria] = useState("");
  const [imagen, setImagen] = useState(null); 
  const [imagenUrlActual, setImagenUrlActual] = useState(""); 
  const [productos, setProductos] = useState([]);
  const [editandoId, setEditandoId] = useState(null);

  // --- ESTADOS DE VENTAS Y REPORTES ---
  const [ventas, setVentas] = useState([]);
  const [datosGrafico, setDatosGrafico] = useState([]);
  const [datosCategorias, setDatosCategorias] = useState([]);
  const [totalGanancia, setTotalGanancia] = useState(0);
  const [cargando, setCargando] = useState(false);

  // Colores para el gráfico de torta (Estética Cucharadita Misteriosa)
  const COLORES_TORTA = ['#B5838D', '#E5989B', '#6D6875', '#FFB4A2', '#FCD5CE'];

  const cargarDatos = async () => {
    try {
      // 1. Cargar Productos ordenados por nombre
      const qProd = query(collection(db, "productos"), orderBy("nombre", "asc"));
      const resProd = await getDocs(qProd);
      const listaProd = resProd.docs.map(d => ({ id: d.id, ...d.data() }));
      setProductos(listaProd);

      // 2. Cargar Ventas (pedidos) ordenadas por fecha reciente
      const qVentas = query(collection(db, "pedidos"), orderBy("fecha", "desc"));
      const resVentas = await getDocs(qVentas);
      const listaVentas = resVentas.docs.map(d => ({ id: d.id, ...d.data() }));
      setVentas(listaVentas);

      // 3. Procesar Estadísticas
      procesarEstadisticas(listaVentas);
    } catch (e) { console.error("Error cargando datos:", e); }
  };

  const procesarEstadisticas = (lista) => {
    const ventasPorDia = {};
    const conteoCategorias = {};
    let acumulado = 0;

    lista.forEach(v => {
      if (!v.fecha) return;
      
      // Datos para gráfico de Barras
      const fechaClave = new Date(v.fecha.seconds * 1000).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
      ventasPorDia[fechaClave] = (ventasPorDia[fechaClave] || 0) + v.total;
      acumulado += v.total;

      // Datos para gráfico de Torta (Categorías)
      v.items?.forEach(item => {
        const cat = item.categoria || "Otros";
        conteoCategorias[cat] = (conteoCategorias[cat] || 0) + item.cantidad;
      });
    });

    const dataBarras = Object.keys(ventasPorDia).map(fecha => ({ name: fecha, ganancia: ventasPorDia[fecha] })).reverse().slice(-7);
    const dataTorta = Object.keys(conteoCategorias).map(cat => ({ name: cat, value: conteoCategorias[cat] }));

    setDatosGrafico(dataBarras);
    setDatosCategorias(dataTorta);
    setTotalGanancia(acumulado);
  };

  useEffect(() => { cargarDatos(); }, []);

  // --- LÓGICA DE GESTIÓN DE PRODUCTOS ---
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
      const data = { 
        nombre, 
        descripcion, 
        categoria, 
        precio: Number(precio), 
        stock: Number(stock), 
        imagenUrl: url || "https://via.placeholder.com/250" 
      };

      if (editandoId) await updateDoc(doc(db, "productos", editandoId), data);
      else await addDoc(collection(db, "productos"), data);
      
      limpiarForm();
      cargarDatos();
      alert("¡Éxito!");
    } catch (e) { alert("Error al guardar"); }
    finally { setCargando(false); }
  };

  const eliminarProducto = async (id) => {
    if(confirm("¿Borrar este producto?")) {
      await deleteDoc(doc(db, "productos", id));
      cargarDatos();
    }
  };

  const limpiarForm = () => {
    setEditandoId(null); setNombre(""); setPrecio(""); setDescripcion(""); setStock(""); setCategoria(""); setImagenUrlActual(""); setImagen(null);
  };

  const contactarCliente = (venta) => {
    const msg = `Hola ${venta.cliente.nombre}, ¡gracias por tu compra en Cucharadita Misteriosa! Recibimos tu pedido de: ${venta.items.map(i => i.nombre).join(", ")}. Estaremos en contacto pronto.`;
    window.open(`https://wa.me/${venta.cliente.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10 bg-[#FCF9F6] min-h-screen">
      <h1 className="text-4xl font-serif text-[#B5838D] mb-8 text-center italic font-bold">Panel de Gestión</h1>

      <Tabs aria-label="Menu" color="secondary" variant="underlined" fullWidth size="lg">
        
        {/* PESTAÑA 1: REPORTES Y GRÁFICOS */}
        <Tab key="reportes" title="📊 ESTADÍSTICAS">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 mb-8">
            <Card className="bg-[#B5838D] text-white p-6 shadow-sm border-none">
              <p className="text-xs uppercase font-bold opacity-80 tracking-widest">Ganancia Total</p>
              <h2 className="text-4xl font-bold">${totalGanancia.toLocaleString()}</h2>
            </Card>
            <Card className="bg-[#6D6875] text-white p-6 shadow-sm border-none">
              <p className="text-xs uppercase font-bold opacity-80 tracking-widest">Ventas Totales</p>
              <h2 className="text-4xl font-bold">{ventas.length}</h2>
            </Card>
            <Card className="bg-[#E5989B] text-white p-6 shadow-sm border-none">
              <p className="text-xs uppercase font-bold opacity-80 tracking-widest">Ticket Promedio</p>
              <h2 className="text-4xl font-bold">${ventas.length > 0 ? (totalGanancia / ventas.length).toFixed(0) : 0}</h2>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="p-6 bg-white border-none shadow-sm">
              <h3 className="text-lg font-bold text-[#4A4A4A] mb-6 uppercase tracking-tighter">Ventas Diarias ($)</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={datosGrafico}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6D6875', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6D6875', fontSize: 12}} />
                    <Tooltip cursor={{fill: '#FCF9F6'}} contentStyle={{borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'}} />
                    <Bar dataKey="ganancia" fill="#B5838D" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6 bg-white border-none shadow-sm">
              <h3 className="text-lg font-bold text-[#4A4A4A] mb-6 uppercase tracking-tighter">Categorías Vendidas</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={datosCategorias} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                      {datosCategorias.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORES_TORTA[index % COLORES_TORTA.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </Tab>

        {/* PESTAÑA 2: VENTAS RECIBIDAS */}
        <Tab key="ventas" title="🛒 VENTAS">
          <div className="flex flex-col gap-6 mt-6">
            {ventas.length === 0 ? (
              <p className="text-center text-gray-400 py-20 italic">No hay ventas registradas aún.</p>
            ) : (
              ventas.map((v) => (
                <Card key={v.id} className="border-l-8 border-[#B5838D] p-5 bg-white shadow-sm border-none">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {v.fecha ? new Date(v.fecha.seconds * 1000).toLocaleDateString() : 'Procesando...'}
                        </span>
                        <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded uppercase">Pago Recibido</span>
                      </div>
                      <h3 className="text-xl font-bold text-[#4A4A4A]">{v.cliente?.nombre}</h3>
                      <div className="bg-[#FCF9F6] p-3 rounded-lg mt-3 border border-[#FCD5CE]">
                        <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Pedido Detalle:</p>
                        {v.items?.map((it, i) => <p key={i} className="text-sm text-[#6D6875]">• {it.nombre} (x{it.cantidad})</p>)}
                      </div>
                    </div>
                    <div className="text-right flex flex-col gap-2">
                      <p className="text-2xl font-bold text-[#B5838D]">${v.total}</p>
                      <Button className="bg-[#25D366] text-white font-bold" size="sm" onClick={() => contactarCliente(v)}>
                        Contactar WhatsApp
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </Tab>

        {/* PESTAÑA 3: INVENTARIO */}
        <Tab key="productos" title="💄 INVENTARIO">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
            <Card className="p-6 bg-white shadow-sm border-none h-fit">
              <h2 className="text-xl font-bold text-[#4A4A4A] mb-4">{editandoId ? "Editar" : "Nuevo"} Producto</h2>
              <form onSubmit={guardarProducto} className="flex flex-col gap-4">
                <Input label="Nombre" value={nombre} onValueChange={setNombre} isRequired variant="bordered" />
                <Input label="Precio" type="number" value={precio} onValueChange={setPrecio} isRequired variant="bordered" />
                <Input label="Stock" type="number" value={stock} onValueChange={setStock} isRequired variant="bordered" />
                <Input label="Categoría" value={categoria} onValueChange={setCategoria} variant="bordered" />
                <Textarea label="Descripción" value={descripcion} onValueChange={setDescripcion} variant="bordered" />
                <input type="file" className="text-xs" onChange={(e) => setImagen(e.target.files[0])} />
                <Button type="submit" isLoading={cargando} className="bg-[#B5838D] text-white font-bold">
                  {editandoId ? "Actualizar" : "Publicar"} Producto
                </Button>
                {editandoId && <Button variant="light" onClick={limpiarForm}>Cancelar</Button>}
              </form>
            </Card>

            <div className="flex flex-col gap-4 overflow-y-auto max-h-[600px] p-2">
              {productos.map(p => (
                <Card key={p.id} className="p-3 bg-white border-none shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <img src={p.imagenUrl} className="w-14 h-14 object-cover rounded-lg" />
                      <div>
                        <p className="font-bold text-[#4A4A4A]">{p.nombre}</p>
                        <p className="text-xs text-[#B5838D]">Precio: ${p.precio} | Stock: {p.stock}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="flat" color="secondary" onClick={() => {
                        setEditandoId(p.id); setNombre(p.nombre); setPrecio(p.precio.toString()); setStock(p.stock.toString()); 
                        setCategoria(p.categoria); setDescripcion(p.descripcion); setImagenUrlActual(p.imagenUrl);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}>Editar</Button>
                      <Button size="sm" variant="flat" color="danger" onClick={() => eliminarProducto(p.id)}>X</Button>
                    </div>
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