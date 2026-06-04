import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Credenciales integradas del proyecto del usuario
const firebaseConfig = {
    apiKey: "AIzaSyBfu8atBkW0-37cbRsU89LN-91wZ4NLBQo",
    authDomain: "lead-visualizer.firebaseapp.com",
    projectId: "lead-visualizer",
    storageBucket: "lead-visualizer.firebasestorage.app",
    messagingSenderId: "384101381800",
    appId: "1:384101381800:web:f5a66f5a14202da007f49d"
};

// Inicialización de la capa de servicios de Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Colección estandarizada en singular para almacenamiento persistente
const leadCollection = collection(db, "lead");

// Elementos de captura de la interfaz
const btnVerLeads = document.getElementById('btn-ver-leads');
const btnAgregarLead = document.getElementById('btn-agregar-lead');
const sectionVisualizador = document.getElementById('section-visualizador');
const sectionFormulario = document.getElementById('section-formulario');
const leadForm = document.getElementById('lead-form');
const leadsGrid = document.getElementById('leads-grid');
const searchBar = document.getElementById('search-bar');

let localLeadsMemory = []; // Caché en memoria para evitar llamadas redundantes en filtrados masivos

// --- NAVEGACIÓN Y FLUJO DE PANTALLAS ---
btnVerLeads.addEventListener('click', () => {
    switchSection(sectionVisualizador, btnVerLeads);
    fetchLeadsFromCloud(); 
});

btnAgregarLead.addEventListener('click', () => {
    switchSection(sectionFormulario, btnAgregarLead);
});

function switchSection(targetSection, activeBtn) {
    sectionVisualizador.classList.add('hidden');
    sectionFormulario.classList.add('hidden');
    btnVerLeads.classList.remove('active');
    btnAgregarLead.classList.remove('active');

    targetSection.classList.remove('hidden');
    activeBtn.classList.add('active');
}

// --- CONSULTA ASÍNCRONA A CLOUD FIRESTORE ---
async function fetchLeadsFromCloud() {
    try {
        // Estructura de consulta ordenando cronológicamente de forma descendente
        const q = query(leadCollection, orderBy("createdat", "desc"));
        const querySnapshot = await getDocs(q);
        
        localLeadsMemory = [];
        querySnapshot.forEach((doc) => {
            localLeadsMemory.push({ id: doc.id, ...doc.data() });
        });

        renderLeads(localLeadsMemory);
    } catch (error) {
        console.error("Error obteniendo datos: ", error);
        leadsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: red;">Error al sincronizar con la base de datos distribuida o faltan configurar Reglas de Prueba.</p>`;
    }
}

// --- RENDERIZACIÓN DINÁMICA DE TARJETAS ---
function renderLeads(leadsToRender) {
    leadsGrid.innerHTML = '';

    if (leadsToRender.length === 0) {
        leadsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No existen clientes potenciales registrados en el sistema.</p>`;
        return;
    }

    leadsToRender.forEach(lead => {
        const card = document.createElement('div');
        card.classList.add('lead-card');

        card.innerHTML = `
            <div>
                <span class="lead-tag">${lead.type}</span>
                <h3>${lead.name}</h3>
                <div class="rating-box">⭐ ${lead.rating} <span>(${lead.reviews} reseñas)</span></div>
                <div class="lead-info">
                    <p>📍 <strong>${lead.location}</strong></p>
                    <p>🏠 <small>${lead.address}</small></p>
                    ${lead.phone ? `<p>📞 ${lead.phone}</p>` : ''}
                    ${lead.email ? `<p>✉️ ${lead.email}</p>` : ''}
                </div>
            </div>
            <div class="lead-actions">
                <a href="${lead.maps}" target="_blank" class="btn-maps">Ver en Google Maps</a>
            </div>
        `;
        leadsGrid.appendChild(card);
    });
}

// --- ESCRITURA Y PERSISTENCIA DE NUEVOS CLIENTES ---
leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSave = document.getElementById('btn-save');
    btnSave.innerText = "Sincronizando con la nube...";
    btnSave.disabled = true;

    // Normalización de datos antes del envío
    const newLead = {
        name: document.getElementById('lead-name').value,
        type: document.getElementById('lead-type').value,
        rating: parseFloat(document.getElementById('lead-rating').value),
        reviews: parseInt(document.getElementById('lead-reviews').value, 10),
        address: document.getElementById('lead-address').value,
        location: document.getElementById('lead-location').value,
        maps: document.getElementById('lead-maps').value,
        phone: document.getElementById('lead-phone').value || null,
        email: document.getElementById('lead-email').value || null,
        createdat: Date.now() 
    };

    try {
        await addDoc(leadCollection, newLead);
        leadForm.reset();
        btnVerLeads.click(); // Retorno automático a la pantalla principal
    } catch (error) {
        alert("Ocurrió un error en la persistencia web: " + error.message);
    } finally {
        btnSave.innerText = "Guardar Cliente en la Nube";
        btnSave.disabled = false;
    }
});

// --- FILTRO INSTANTÁNEO EN CLIENTE ---
searchBar.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredLeads = localLeadsMemory.filter(lead => 
        lead.name.toLowerCase().includes(searchTerm) || 
        lead.type.toLowerCase().includes(searchTerm) ||
        lead.location.toLowerCase().includes(searchTerm)
    );
    renderLeads(filteredLeads);
});

// Inicialización automática de la vista distribuida
fetchLeadsFromCloud();