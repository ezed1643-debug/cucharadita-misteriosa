"use client";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { 
  Card, CardBody, CardFooter, Image, Button, 
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Badge, Input, Divider 
} from "@nextui-org/react";

export default function Catalogo() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  
  // Estados para el envío
  const [codigoPostal, setCodigoPostal] = useState("");
  const [costoEnvio, setCostoEnvio] = useState(null);
  const [calculandoEnvio, setCalculandoEnvio] = useState(false);
  const [creandoPago, setCreandoPago] = useState(false);

  const {isOpen, onOpen, onOpenChange} = useDisclosure();

  useEffect(() => {
    const traerProductos = async () => {
      const querySnapshot = await getDocs(collection(db, "productos"));
      const docs = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setProductos(docs);
    };
    traerProductos();
  }, []);

  const agregarAlCarrito = (producto) => {
    setCarrito(prev => {
      const existe = prev.find(item => item.id === producto.id);
      if (existe) {
        return prev.map(item => item.id === producto.id 
          ? { ...item, cantidad: item.cantidad + 1 } : item);
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  // Función simulada para calcular envío (Aquí luego conectaremos Correo Argentino)
  const calcularEnvio = () => {
    if (!codigoPostal) return;
    
    setCalculandoEnvio(true);
    
    // Simulamos una demora de red (1 segundo)
    setTimeout(() => {
      if (codigoPostal === "3153") {
        // Si es de Victoria, Entre Ríos, el envío es gratis o retiro en local
        setCostoEnvio(0); 
      } else {
        // Costo simulado para el resto del país
        setCostoEnvio(5500); 
      }
      setCalculandoEnvio(false);
    }, 1000);
  };

  const pagarConMercadoPago = async () => {
    setCreandoPago(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrito: carrito,
          costoEnvio: costoEnvio
        })
      });
      const data = await res.json();
      
      if (data.url) {
        // Guardamos los datos en la memoria del navegador antes de salir
        localStorage.setItem("carritoPendiente", JSON.stringify(carrito));
        localStorage.setItem("envioPendiente", costoEnvio.toString());
        
        // Redirigimos al usuario
        window.location.href = data.url; 
      } else {
        alert("Hubo un error al generar el pago.");
        setCreandoPago(false);
      }
    } catch (error) {
      console.error(error);
      setCreandoPago(false);
    }
  };

  const subtotal = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  const cantidadItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);
  // El total final suma el subtotal y el envío (si ya se calculó)
  const totalFinal = subtotal + (costoEnvio || 0);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Nuestro Catálogo</h1>
        <Badge content={cantidadItems} color="primary" isInvisible={cantidadItems === 0}>
          <Button onPress={onOpen} color="secondary" variant="flat">
            Ver Carrito (${subtotal})
          </Button>
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {productos.map((prod) => (
          <Card key={prod.id} shadow="sm" className="border">
            <CardBody className="overflow-visible p-0">
              <Image
                shadow="sm"
                radius="none"
                width="100%"
                alt={prod.nombre}
                className="w-full object-cover h-[250px]"
                src={prod.imagenUrl || "https://via.placeholder.com/250"}
              />
            </CardBody>
            <CardFooter className="text-small justify-between flex-col items-start gap-2">
              <b className="text-lg">{prod.nombre}</b>
              <p className="text-default-500 font-bold text-xl">${prod.precio}</p>
              <Button color="primary" fullWidth variant="flat" onPress={() => agregarAlCarrito(prod)}>
                Agregar al carrito
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Tu Pedido</ModalHeader>
              <ModalBody>
                {carrito.length === 0 ? (
                  <p>Tu carrito está vacío.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {/* Lista de productos */}
                    {carrito.map((item) => (
                      <div key={item.id} className="flex justify-between border-b pb-2">
                        <div>
                          <p className="font-bold">{item.nombre}</p>
                          <p className="text-sm text-gray-500">Cant: {item.cantidad} x ${item.precio}</p>
                        </div>
                        <p className="font-bold">${item.precio * item.cantidad}</p>
                      </div>
                    ))}

                    {/* Sección de Envío */}
                    <div className="bg-gray-50 p-4 rounded-lg mt-2">
                      <h3 className="font-semibold text-sm mb-2">Cálculo de envío</h3>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Tu Código Postal" 
                          size="sm"
                          value={codigoPostal}
                          onValueChange={setCodigoPostal}
                        />
                        <Button 
                          size="sm" 
                          color="primary" 
                          isLoading={calculandoEnvio}
                          onPress={calcularEnvio}
                        >
                          Calcular
                        </Button>
                      </div>
                      
                      {costoEnvio !== null && (
                        <p className="text-sm mt-2 text-green-600 font-medium">
                          {costoEnvio === 0 ? "Retiro en local / Envío gratis (Victoria)" : `Costo de envío: $${costoEnvio}`}
                        </p>
                      )}
                    </div>

                    <Divider />

                    {/* Totales */}
                    <div className="flex justify-between items-center text-xl font-bold">
                      <span>Total Final:</span>
                      <span>${totalFinal}</span>
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cerrar
                </Button>
                {/* Este botón lo conectaremos a Mercado Pago */}
                <Button 
                    color="primary" 
                    isDisabled={carrito.length === 0 || costoEnvio === null}
                    isLoading={creandoPago}
                    onPress={pagarConMercadoPago}
                    >
                    Pagar con Mercado Pago
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}