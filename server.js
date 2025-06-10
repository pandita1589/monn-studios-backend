// server.js - Backend para monn Studios (Configuración Global)
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
    origin: '*', // Permite cualquier origen
    credentials: true
}));
app.use(express.json());

// 🔗 TU CONNECTION STRING DE MONGODB ATLAS
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://fabian1234andre:GWOLQUQqWRu2MPZ9@cluster0.ttvffqo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Configuración de la base de datos
const DB_NAME = 'monn_studios';
const COLLECTION_NAME = 'global_config';
const CONFIG_ID = 'global_countdown_config';

let client;

// Conectar a MongoDB
async function connectToMongoDB() {
    try {
        client = new MongoClient(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        await client.connect();
        console.log('✅ ¡Conectado a MongoDB Atlas exitosamente!');
        console.log('🌍 Backend listo para monn Studios');
        
        // Test de conexión
        await client.db(DB_NAME).admin().ping();
        console.log('🏓 Ping a MongoDB exitoso');
        
        return true;
    } catch (error) {
        console.error('❌ Error conectando a MongoDB:', error.message);
        console.log('💡 Verifica tu connection string y que MongoDB Atlas esté configurado correctamente');
        return false;
    }
}

// Middleware para verificar conexión
async function ensureConnection(req, res, next) {
    try {
        if (!client) {
            const connected = await connectToMongoDB();
            if (!connected) {
                return res.status(500).json({ 
                    success: false, 
                    error: 'No se pudo conectar a la base de datos' 
                });
            }
        }
        
        // Verificar que la conexión sigue activa
        await client.db(DB_NAME).admin().ping();
        next();
    } catch (error) {
        console.error('❌ Error de conexión:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error de conexión a la base de datos' 
        });
    }
}

// 📤 ENDPOINT PARA GUARDAR CONFIGURACIÓN GLOBAL (Solo Administrador)
app.post('/api/config', ensureConnection, async (req, res) => {
    try {
        console.log('🌍 GUARDANDO CONFIGURACIÓN GLOBAL DEL ADMINISTRADOR');
        console.log(`📅 Nueva fecha: ${new Date(req.body.targetDate).toLocaleString()}`);
        
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);
        
        // Preparar documento de configuración global
        const configDoc = {
            _id: CONFIG_ID,
            targetDate: req.body.targetDate,
            configuredBy: req.body.configuredBy || 'AndreSM',
            configuredAt: req.body.configuredAt || new Date().toISOString(),
            lastUpdate: new Date().toISOString(),
            updateCount: 1,
            isGlobal: true,
            description: 'Configuración global para todos los visitantes de monn Studios'
        };
        
        // Obtener configuración existente para incrementar contador
        const existingConfig = await collection.findOne({ _id: CONFIG_ID });
        if (existingConfig) {
            configDoc.updateCount = (existingConfig.updateCount || 0) + 1;
            console.log(`🔄 Actualizando configuración (cambio #${configDoc.updateCount})`);
        } else {
            console.log('🆕 Creando primera configuración global');
        }
        
        // Guardar configuración global
        const result = await collection.replaceOne(
            { _id: CONFIG_ID },
            configDoc,
            { upsert: true }
        );
        
        console.log('✅ ¡CONFIGURACIÓN GLOBAL GUARDADA EXITOSAMENTE!');
        console.log('👥 Ahora TODOS los visitantes verán esta nueva fecha');
        
        res.json({
            success: true,
            message: 'Configuración global guardada para todos los visitantes',
            data: {
                acknowledged: result.acknowledged,
                modifiedCount: result.modifiedCount,
                upsertedCount: result.upsertedCount,
                config: configDoc,
                globalUpdate: true
            }
        });
        
    } catch (error) {
        console.error('❌ Error guardando configuración global:', error);
        res.status(500).json({
            success: false,
            error: 'Error guardando configuración global: ' + error.message
        });
    }
});

// 📥 ENDPOINT PARA CARGAR CONFIGURACIÓN GLOBAL (Para todos los visitantes)
app.get('/api/config', ensureConnection, async (req, res) => {
    try {
        console.log('📥 Visitante cargando configuración global...');
        
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);
        
        const config = await collection.findOne({ _id: CONFIG_ID });
        
        if (config) {
            console.log('✅ Enviando configuración global al visitante');
            console.log(`🎯 Fecha: ${new Date(config.targetDate).toLocaleString()}`);
            
            res.json({
                success: true,
                message: 'Configuración global cargada',
                data: config,
                isGlobal: true
            });
        } else {
            console.log('📭 No hay configuración global guardada aún');
            res.json({
                success: false,
                error: 'No hay configuración global guardada por el administrador',
                isGlobal: false
            });
        }
        
    } catch (error) {
        console.error('❌ Error cargando configuración global:', error);
        res.status(500).json({
            success: false,
            error: 'Error cargando configuración global: ' + error.message
        });
    }
});

// 🏥 ENDPOINT DE SALUD
app.get('/api/health', async (req, res) => {
    try {
        if (client) {
            await client.db(DB_NAME).admin().ping();
            res.json({
                status: 'ok',
                service: 'monn Studios Global Config API',
                mongodb: 'connected',
                timestamp: new Date().toISOString(),
                message: '🚀 Backend funcionando correctamente'
            });
        } else {
            res.status(503).json({
                status: 'error',
                service: 'monn Studios Global Config API',
                mongodb: 'disconnected',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        res.status(503).json({
            status: 'error',
            service: 'monn Studios Global Config API',
            mongodb: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Página de info para el root
app.get('/', (req, res) => {
    res.json({
        service: '🚀 monn Studios - Global Configuration API',
        version: '1.0.0',
        description: 'API para configuración global de countdown de Luna Net',
        status: 'running',
        endpoints: {
            'GET /api/health': 'Estado del servicio',
            'GET /api/config': 'Cargar configuración global (para visitantes)',
            'POST /api/config': 'Guardar configuración global (solo administrador)',
        },
        flow: {
            admin: '👤 Administrador: Login → Configurar fecha → Guardar globalmente',
            visitors: '👥 Visitantes: Cargar automáticamente la fecha del administrador'
        }
    });
});

// Manejo de errores de proceso
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando servidor...');
    if (client) {
        await client.close();
        console.log('📤 Conexión a MongoDB cerrada');
    }
    process.exit(0);
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        const connected = await connectToMongoDB();
        
        if (connected) {
            app.listen(PORT, () => {
                console.log('');
                console.log('🎉 ¡monn Studios Backend iniciado exitosamente!');
                console.log(`🌐 URL: http://localhost:${PORT}`);
                console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
                console.log('');
                console.log('🎯 FLUJO DE CONFIGURACIÓN:');
                console.log('👤 ADMINISTRADOR:');
                console.log('   1. Login con AndreSM/andre1589 en el frontend');
                console.log('   2. Configurar fecha en panel');
                console.log('   3. Guardar → Se sincroniza globalmente en MongoDB');
                console.log('');
                console.log('👥 VISITANTES:');
                console.log('   1. Entran a la web');
                console.log('   2. Ven automáticamente la fecha configurada por el admin');
                console.log('   3. Sin login requerido');
                console.log('');
                console.log('✅ ¡Listo para configuración global de Luna Net!');
            });
        } else {
            console.error('❌ No se pudo iniciar - Error de conexión a MongoDB');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Error iniciando servidor:', error);
        process.exit(1);
    }
}

startServer();