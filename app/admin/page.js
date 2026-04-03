"use client";
import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
// Fíjate que aquí usamos DOS puntos porque admin está más profundo
import { db, storage } from "../../lib/firebase"; 
import { Card, CardBody, Input, Button, Divider } from "@nextui-org/react";

export default function AdminPanel() {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [imagen, setImagen] = useState(null); 
  const [cargando, setCargando] = useState(false);

  const guardarProducto = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      let imagenSubidaUrl = "";

      if (imagen) {
        const nombreArchivo = `${Date.now()}_${imagen.name}`;
        const imageRef = ref(storage, `fotos_productos/${nombreArchivo}`);
        await uploadBytes(imageRef, imagen);
        imagenSubidaUrl = await getDownloadURL(imageRef);
      }

      await addDoc(collection(db, "productos"), {
        nombre: nombre,
        precio: Number(precio),
        imagenUrl: imagenSubidaUrl || "https://via.placeholder.com/250"
      });

      alert("¡Producto cargado con éxito!");
      
      setNombre("");
      setPrecio("");
      setImagen(null);
      document.getElementById('selector-foto').value = '';
      
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Hubo un error al guardar el producto.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 mt-10">
      <h1 className="text-3xl font-serif text-[#B5838D] mb-6 text-center">Panel de Control</h1>
      
      <Card shadow="sm" className="p-4 border border-[#FCD5CE]">
        <CardBody>
          <h2 className="text-xl font-semibold mb-4 text-[#4A4A4A]">Cargar Nuevo Producto</h2>
          <Divider className="mb-6" />
          
          <form onSubmit={guardarProducto} className="flex flex-col gap-4">
            <Input 
              isRequired
              label="Nombre del producto" 
              placeholder="Ej: Paleta de sombras Nude"
              value={nombre}
              onValueChange={setNombre}
            />
            
            <Input 
              isRequired
              type="number"
              label="Precio" 
              placeholder="Ej: 12000"
              value={precio}
              onValueChange={setPrecio}
              startContent={
                <div className="pointer-events-none flex items-center">
                  <span className="text-default-400 text-small">$</span>
                </div>
              }
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm text-[#6D6875] font-medium ml-1">
                Foto del producto
              </label>
              <input 
                id="selector-foto"
                type="file" 
                accept="image/*"
                onChange={(e) => setImagen(e.target.files[0])}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-[#FCD5CE] file:text-[#4A4A4A]
                  hover:file:bg-[#E5989B] cursor-pointer"
              />
            </div>

            <Button 
              type="submit" 
              className="mt-4 bg-[#6D6875] text-white shadow-md hover:bg-[#4A4A4A]" 
              size="lg" 
              isLoading={cargando}
            >
              Publicar Producto
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}