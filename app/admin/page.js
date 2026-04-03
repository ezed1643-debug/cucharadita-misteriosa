"use client";
import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../lib/firebase"; 
import { Card, CardBody, Input, Button, Divider } from "@nextui-org/react";

export default function AdminPanel() {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [imagen, setImagen] = useState(null); // Ahora guarda el archivo real
  const [cargando, setCargando] = useState(false);

  const guardarProducto = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      let imagenSubidaUrl = "";

      // 1. Si el usuario seleccionó una foto, la subimos a Firebase Storage primero
      if (imagen) {
        // Le damos un nombre único a la foto para que no se pisen
        const nombreArchivo = `${Date.now()}_${imagen.name}`;
        const imageRef = ref(storage, `fotos_servicios/${nombreArchivo}`);
        
        // Subimos el archivo
        await uploadBytes(imageRef, imagen);
        // Obtenemos el link de descarga público
        imagenSubidaUrl = await getDownloadURL(imageRef);
      }

      // 2. Guardamos los datos del servicio en la base de datos
      await addDoc(collection(db, "productos"), {
        nombre: nombre,
        precio: Number(precio),
        imagenUrl: imagenSubidaUrl || "https://via.placeholder.com/250" // Foto por defecto si no sube nada
      });

      alert("¡Servicio cargado con éxito!");
      
      // Limpiamos el formulario
      setNombre("");
      setPrecio("");
      setImagen(null);
      // Reseteamos el input de archivo manualmente
      document.getElementById('selector-foto').value = '';
      
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Hubo un error al guardar el servicio.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 mt-10">
      <h1 className="text-3xl font-bold mb-6 text-center">Panel de Control</h1>
      
      <Card shadow="sm" className="p-4">
        <CardBody>
          <h2 className="text-xl font-semibold mb-4">Cargar Nuevo Servicio</h2>
          <Divider className="mb-6" />
          
          <form onSubmit={guardarProducto} className="flex flex-col gap-4">
            <Input 
              isRequired
              label="Nombre del servicio" 
              placeholder="Ej: Carpa Beduina 10x10"
              value={nombre}
              onValueChange={setNombre}
            />
            
            <Input 
              isRequired
              type="number"
              label="Precio" 
              placeholder="Ej: 150000"
              value={precio}
              onValueChange={setPrecio}
              startContent={
                <div className="pointer-events-none flex items-center">
                  <span className="text-default-400 text-small">$</span>
                </div>
              }
            />

            {/* Nuevo botón para subir archivos */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600 font-medium ml-1">
                Foto del servicio
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
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100 cursor-pointer"
              />
            </div>

            <Button 
              type="submit" 
              color="primary" 
              size="lg" 
              className="mt-4"
              isLoading={cargando}
            >
              Publicar Servicio
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}