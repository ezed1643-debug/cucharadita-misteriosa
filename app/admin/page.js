"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../lib/firebase"; 
import { Card, CardBody, Input, Button, Divider, Textarea } from "@nextui-org/react";

export default function AdminPanel() {
  // Estados del formulario
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [stock, setStock] = useState("");
  const [imagen, setImagen] = useState(null); 
  const [imagenUrlActual, setImagenUrlActual] = useState(""); 
  
  // Estados de control
  const [cargando, setCargando] = useState(false);
  const [productos, setProductos] = useState([]);
  const [editandoId, setEditandoId] = useState(null);

  // Cargar productos al abrir el panel
  const cargarProductos = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "productos"));
      const docs = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      setProductos(docs);
    } catch (error) {
      console.error("Error al cargar lista:", error);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  // Función principal: Guardar o Actualizar
  const guardarProducto = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      let imagenFinalUrl = imagenUrlActual; // Por defecto, conserva la imagen anterior si la hay

      // Si el usuario seleccionó una foto NUEVA, la subimos
      if (imagen) {
        const nombreArchivo = `${Date.now()}_${imagen.name}`;
        const imageRef = ref(storage, `fotos_productos/${nombreArchivo}`);
        await uploadBytes(imageRef, imagen);
        imagenFinalUrl = await getDownloadURL(imageRef);
      }

      const datosProducto = {
        nombre,
        descripcion,
        precio: Number(precio),
        stock: Number(stock),
        imagenUrl: imagenFinalUrl || "https://via.placeholder.com/250"
      };

      if (editandoId) {
        // ACTUALIZAR producto existente
        await updateDoc(doc(db, "productos", editandoId), datosProducto);
        alert("¡Producto actualizado!");
      } else {
        // CREAR producto nuevo
        await addDoc(collection(db, "productos"), datosProducto);
        alert("¡Producto creado con éxito!");
      }
      
      // Limpiar formulario y recargar lista
      limpiarFormulario();
      cargarProductos();
      
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Hubo un error al guardar el producto.");
    } finally {
      setCargando(false);
    }
  };

  // Función para preparar la edición
  const prepararEdicion = (prod) => {
    setEditandoId(prod.id);
    setNombre(prod.nombre);
    setPrecio(prod.precio.toString());
    setDescripcion(prod.descripcion || "");
    setStock(prod.stock ? prod.stock.toString() : "0");
    setImagenUrlActual(prod.imagenUrl || "");
    setImagen(null); // Resetea el archivo seleccionado
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Sube la pantalla
  };

  // Función para cancelar la edición y limpiar
  const limpiarFormulario = () => {
    setEditandoId(null);
    setNombre("");
    setPrecio("");
    setDescripcion("");
    setStock("");
    setImagenUrlActual("");
    setImagen(null);
    const inputFoto = document.getElementById('selector-foto');
    if(inputFoto) inputFoto.value = '';
  };

  // Función para eliminar un producto
  const eliminarProducto = async (id) => {
    if (window.confirm("¿Estás segura de que quieres borrar este producto?")) {
      try {
        await deleteDoc(doc(db, "productos", id));
        cargarProductos(); // Recarga la lista
      } catch (error) {
        console.error("Error al eliminar:", error);
        alert("No se pudo eliminar.");
      }
    }
  };

  // Función rápida para cambiar stock con los botones + y -
  const modificarStockRapido = async (id, stockActual, cambio) => {
    const nuevoStock = stockActual + cambio;
    if (nuevoStock < 0) return; // No permitir stock negativo
    
    try {
      await updateDoc(doc(db, "productos", id), { stock: nuevoStock });
      cargarProductos();
    } catch (error) {
      console.error("Error al cambiar stock:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 mt-10">
      <h1 className="text-3xl font-serif text-[#B5838D] mb-6 text-center">Centro de Control</h1>
      
      {/* SECCIÓN 1: FORMULARIO */}
      <Card shadow="sm" className="p-4 border border-[#FCD5CE] mb-10">
        <CardBody>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-[#4A4A4A]">
              {editandoId ? "✏️ Editando Producto" : "✨ Cargar Nuevo Producto"}
            </h2>
            {editandoId && (
              <Button size="sm" color="danger" variant="light" onClick={limpiarFormulario}>
                Cancelar Edición
              </Button>
            )}
          </div>
          <Divider className="mb-6" />
          
          <form onSubmit={guardarProducto} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                isRequired label="Nombre" placeholder="Ej: Sérum Facial"
                value={nombre} onValueChange={setNombre}
              />
              <Input 
                isRequired type="number" label="Precio ($)" placeholder="Ej: 15000"
                value={precio} onValueChange={setPrecio}
              />
            </div>

            <Textarea
              label="Descripción del producto"
              placeholder="Ej: Sérum hidratante con ácido hialurónico..."
              value={descripcion}
              onValueChange={setDescripcion}
            />

            <Input 
              isRequired type="number" label="Cantidad en Stock" placeholder="Ej: 25"
              value={stock} onValueChange={setStock}
            />

            <div className="flex flex-col gap-1 p-3 border border-dashed border-[#FCD5CE] rounded-xl bg-white/50">
              <label className="text-sm text-[#6D6875] font-medium ml-1">
                {editandoId ? "Cambiar foto (dejar vacío para mantener la actual)" : "Subir foto del producto"}
              </label>
              <input 
                id="selector-foto" type="file" accept="image/*"
                onChange={(e) => setImagen(e.target.files[0])}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0
                  file:text-sm file:font-semibold file:bg-[#FCD5CE] file:text-[#4A4A4A] hover:file:bg-[#E5989B] cursor-pointer"
              />
            </div>

            <Button 
              type="submit" 
              className={`mt-4 text-white shadow-md ${editandoId ? 'bg-[#E5989B]' : 'bg-[#6D6875] hover:bg-[#4A4A4A]'}`}
              size="lg" isLoading={cargando}
            >
              {editandoId ? "Guardar Cambios" : "Publicar Producto"}
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* SECCIÓN 2: LISTA DE PRODUCTOS */}
      <h2 className="text-2xl font-serif text-[#4A4A4A] mb-4 border-b pb-2">Inventario Actual</h2>
      
      {productos.length === 0 ? (
        <p className="text-gray-500 italic text-center py-10">No hay productos cargados todavía.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {productos.map((prod) => (
            <Card key={prod.id} shadow="sm" className="border border-gray-100">
              <CardBody className="flex flex-row gap-4 items-center p-4">
                <img src={prod.imagenUrl} alt={prod.nombre} className="w-20 h-20 object-cover rounded-lg shadow-sm" />
                
                <div className="flex-1">
                  <h3 className="font-bold text-[#4A4A4A] truncate">{prod.nombre}</h3>
                  <p className="text-sm text-[#B5838D] font-medium">${prod.precio}</p>
                  
                  {/* Control Rápido de Stock */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Stock:</span>
                    <Button size="sm" isIconOnly className="h-6 w-6 min-w-0 bg-gray-100" onClick={() => modificarStockRapido(prod.id, prod.stock || 0, -1)}>-</Button>
                    <span className="font-semibold text-sm w-6 text-center">{prod.stock || 0}</span>
                    <Button size="sm" isIconOnly className="h-6 w-6 min-w-0 bg-gray-100" onClick={() => modificarStockRapido(prod.id, prod.stock || 0, 1)}>+</Button>
                  </div>
                </div>

                {/* Botones de acción (Editar / Borrar) */}
                <div className="flex flex-col gap-2">
                  <Button size="sm" className="bg-[#FCD5CE] text-[#4A4A4A]" onClick={() => prepararEdicion(prod)}>
                    Editar
                  </Button>
                  <Button size="sm" color="danger" variant="flat" onClick={() => eliminarProducto(prod.id)}>
                    Borrar
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}