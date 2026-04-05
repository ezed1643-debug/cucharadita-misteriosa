"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../lib/firebase"; 
import { Card, CardBody, Input, Button, Divider, Textarea, Tabs, Tab, Chip } from "@nextui-org/react";

import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend 
} from 'recharts';

export default function AdminPanel() {
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [datosGrafico, setDatosGrafico] = useState([]);
  const [datosCategorias, setDatosCategorias] = useState([]);
  const [totalGanancia, setTotalGanancia] = useState(0);
  const [cargando, setCargando] = useState(false);

  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [stock, setStock] = useState("");
  const [categoria, setCategoria] = useState("");
  const [imagen, setImagen] = useState(null); 
  const [imagenUrlActual, setImagenUrlActual] = useState(""); 
  const [editandoId, setEditandoId] = useState(null);

  const COLORES_TORTA = ['#B5838D', '#E5989B', '#6D6875', '#FFB4A2', '#FCD5CE'];

  // ¡RECUPERAMOS LAS CATEGORÍAS!
  const categoriasExistentes = Array.from(new Set(productos.map(p => p.categoria).filter(c => c)));

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
      // AQUÍ ESTÁ LA MAGIA: Si el estado es "Pendiente de Pago", NO se suma a las estadísticas.
      if (!v.fecha || v.estado === "Pendiente de Pago") return; 

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

  // LÓGICA DE 3 ESTADOS: Pendiente -> Pagado -> Entregado
  const cambiarEstadoPedido = async (id, estadoActual) => {
    let nuevoEstado = "Pagado";
    if (estadoActual === "Pendiente de Pago") nuevoEstado = "Pagado";
    else if (estadoActual === "Pagado") nuevoEstado = "Entregado";
    else if (estadoActual === "Entregado") nuevoEstado = "Pendiente de Pago"; 

    try {
      await updateDoc(doc(db, "pedidos", id), { estado: nuevoEstado });
      cargarDatos(); 
    } catch (e) { console.error(e); }
  };

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
    const msg = `Hola ${venta.cliente.nombre}, somos de Cucharadita Misteriosa. Te escribimos por tu pedido de: ${venta.items.map(i => i.nombre).join(", ")}.`;
    window.open(`https://wa.me/${venta.cliente.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10 bg-[#FCF9F6] min-h-screen">
      <h1 className="text-4xl font-serif text-[#B5838D] mb-8 text-center italic font-bold">Panel Administrativo</h1>

      {/* PESTAÑAS ORDENADAS: 1. Ventas, 2. Inventario, 3. Estadísticas */}
      <Tabs aria-label="Menu" color="secondary" variant="underlined" fullWidth size="lg">
        
        {/* 1. VENTAS */}
        <Tab key="ventas" title="🛒 VENTAS">
          <div className="flex flex-col gap-6 mt-6">
            {ventas.length === 0 ? (
              <p className="text-center text-gray-400 py-10">No hay ventas registradas aún.</p>
            ) : (
              ventas.map((v) => {
                // Colores y textos según el estado
                let colorChip = "warning"; let textoChip = "⏳ Esperando Pago"; let btnAccion = "Confirmar Pago";
                if (v.estado === "Pagado") { colorChip = "success"; textoChip = "💰 Pagado"; btnAccion = "Marcar Entregado"; }
                if (v.estado === "Entregado") { colorChip = "default"; textoChip = "✓ Entregado"; btnAccion = "Revertir"; }

                return (
                  <Card key={v.id} className={`p-5 shadow-sm transition-opacity border-l-8 ${v.estado === "Pagado" ? "border-green-400" : v.estado === "Entregado" ? "border-gray-300 opacity-60" : "border-orange-300"}`}>
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {v.fecha ? new Date(v.fecha.seconds * 1000).toLocaleDateString() : 'Procesando...'}
                          </span>
                          <Chip size="sm" variant="flat" color={colorChip} className="font-bold text-[10px] uppercase">
                            {textoChip}
                          </Chip>
                        </div>
                        <h3 className="text-xl font-bold text-[#4A4A4A]">{v.cliente?.nombre}</h3>
                        <p className="text-xs text-gray-500 mt-1">Entrega: {v.cliente?.metodoEntrega === "envio" ? `Envío (CP: ${v.cliente?.codigoPostal})` : "Retiro en local"}</p>
                        <div className="bg-[#FCF9F6] p-3 rounded-lg mt-3 border border-[#FCD5CE]">
                          {v.items?.map((it, i) => <p key={i} className="text-sm text-[#6D6875]">• {it.nombre} (x{it.cantidad})</p>)}
                        </div>
                      </div>
                      <div className="flex flex-col justify-between items-end gap-3">
                        <p className="text-2xl font-bold text-[#B5838D]">${v.total}</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="bordered" color={colorChip} className="font-bold bg-white" onClick={() => cambiarEstadoPedido(v.id, v.estado)}>
                            {btnAccion}
                          </Button>
                          <Button size="sm" className="bg-[#25D366] text-white font-bold" onClick={() => contactarCliente(v)}>WhatsApp</Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        </Tab>

        {/* 2. INVENTARIO (CON CATEGORÍAS RESTAURADAS) */}
        <Tab key="productos" title="💄 INVENTARIO">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
            <Card className="p-6 bg-white shadow-sm h-fit">
              <form onSubmit={guardarProducto} className="flex flex-col gap-4">
                <Input label="Nombre" value={nombre} onValueChange={setNombre} isRequired />
                <Input label="Precio" type="number" value={precio} onValueChange={setPrecio} isRequired />
                <Input label="Stock" type="number" value={stock} onValueChange={setStock} isRequired />
                
                {/* INTERFAZ DE CATEGORÍAS RESTAURADA */}
                <div className="flex flex-col gap-2">
                  <Input label="Categoría" value={categoria} onValueChange={setCategoria} placeholder="Ej: Skin Care, Labiales..." />
                  {categoriasExistentes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-[10px] text-gray-400 font-bold mt-1">Sugerencias:</span>
                      {categoriasExistentes.map(cat => (
                        <button key={cat} type="button" onClick={() => setCategoria(cat)} className="text-xs bg-[#FCD5CE]/40 text-[#4A4A4A] px-3 py-1 rounded-full border border-[#FCD5CE] hover:bg-[#FCD5CE]">
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Textarea label="Descripción" value={descripcion} onValueChange={setDescripcion} />
                <input type="file" className="text-xs" onChange={(e) => setImagen(e.target.files[0])} />
                <Button type="submit" isLoading={cargando} className="bg-[#B5838D] text-white font-bold">{editandoId ? "Actualizar" : "Publicar"}</Button>
                {editandoId && <Button variant="light" size="sm" onClick={limpiarForm}>Cancelar</Button>}
              </form>
            </Card>
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[600px] pr-2">
              {productos.map(p => (
                <Card key={p.id} className="p-3 shadow-sm flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={p.imagenUrl} className="w-12 h-12 object-cover rounded" />
                    <div><p className="font-bold text-sm text-[#4A4A4A]">{p.nombre}</p><p className="text-xs text-[#B5838D]">Precio: ${p.precio} | Stock: {p.stock}</p></div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="flat" onClick={() => { setEditandoId(p.id); setNombre(p.nombre); setPrecio(p.precio.toString()); setStock(p.stock.toString()); setCategoria(p.categoria || ""); setDescripcion(p.descripcion || ""); setImagenUrlActual(p.imagenUrl); }}>Editar</Button>
                    <Button size="sm" color="danger" variant="flat" onClick={() => {if(confirm("¿Borrar?")) deleteDoc(doc(db, "productos", p.id)).then(cargarDatos)}}>X</Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </Tab>

        {/* 3. ESTADÍSTICAS */}
        <Tab key="reportes" title="📊 ESTADÍSTICAS">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 mb-8">
            <Card className="bg-[#B5838D] text-white p-6 shadow-sm">
              <p className="text-xs uppercase font-bold opacity-80">Ganancia Real (Pagado)</p>
              <h2 className="text-4xl font-bold">${totalGanancia.toLocaleString()}</h2>
            </Card>
            <Card className="bg-[#6D6875] text-white p-6 shadow-sm">
              <p className="text-xs uppercase font-bold opacity-80">Ventas Concretadas</p>
              {/* Filtramos para no contar los pendientes en el contador principal */}
              <h2 className="text-4xl font-bold">{ventas.filter(v => v.estado !== "Pendiente de Pago").length}</h2>
            </Card>
            <Card className="bg-[#E5989B] text-white p-6 shadow-sm">
              <p className="text-xs uppercase font-bold opacity-80">Ticket Promedio</p>
              <h2 className="text-4xl font-bold">${ventas.filter(v => v.estado !== "Pendiente de Pago").length > 0 ? (totalGanancia / ventas.filter(v => v.estado !== "Pendiente de Pago").length).toFixed(0) : 0}</h2>
            </Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="p-6 bg-white shadow-sm"><h3 className="mb-4 font-bold text-[#4A4A4A]">Ventas Diarias (Cobradas)</h3>
              <div className="h-[250px]"><ResponsiveContainer><BarChart data={datosGrafico}><XAxis dataKey="name"/><Tooltip/><Bar dataKey="ganancia" fill="#B5838D" radius={[4, 4, 0, 0]}/></BarChart></ResponsiveContainer></div>
            </Card>
            <Card className="p-6 bg-white shadow-sm"><h3 className="mb-4 font-bold text-[#4A4A4A]">Categorías Exitosas</h3>
              <div className="h-[250px]"><ResponsiveContainer><PieChart><Pie data={datosCategorias} innerRadius={60} outerRadius={80} dataKey="value">{datosCategorias.map((e, i) => <Cell key={i} fill={COLORES_TORTA[i % COLORES_TORTA.length]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer></div>
            </Card>
          </div>
        </Tab>

      </Tabs>
    </div>
  );
}