# 🧠 Neural Network 3D Visualizer & Simulator

<p align="center">
  <img src="https://img.shields.io/badge/Three.js-r160-000000?style=for-the-badge&logo=three.js&logoColor=white" alt="Three.js" />
  <img src="https://img.shields.io/badge/WebGL-2.0-990000?style=for-the-badge&logo=webgl&logoColor=white" alt="WebGL" />
  <img src="https://img.shields.io/badge/JavaScript-ESM-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/HTML5-CSS3-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License MIT" />
</p>

Um simulador interativo e educacional de **Redes Neurais em 3D** construído com **Three.js**, pós-processamento com **UnrealBloom**, **OrbitControls** suaves e visualização de sinapses em tempo real. Permite explorar arquiteturas neurais clássicas, acompanhar o aprendizado Hebbiano, treinar uma rede real com Backpropagation (resolvendo o problema XOR) e analisar cada propagação no modo passo a passo.

---

## ✨ Funcionalidades Principais

### 🌐 1. Espaço 3D Imersivo & Efeitos Visuais
- **Neurônios Metálicos Esféricos**: Esferas com material reflexivo, rugosidade calculada e miolo emissivo que pulsa conforme a ativação.
- **Pós-processamento UnrealBloom**: Brilho neon suave e cirúrgico em sinapses e nós ativos.
- **Iluminação de Estúdio Tridimensional**: Iluminação ambiente somada a duas luzes direcionais que garantem volume e profundidade às camadas.
- **Zoom Fluido e Contínuo**: Sistema de aproximação por interpolação suave (lerp) sem saltos bruscos.
- **Auto-Órbita**: Rotação suave contínua para apresentações e demonstrações visuais.

### 📐 2. Nove Arquiteturas Neurais Clássicas
Alterne instantaneamente entre as principais topologias do estado da arte:
1. **Deep Feed Forward (DFF)**: Camadas densas tradicionais com processamento hierárquico.
2. **Recurrent Neural Network (RNN)**: Conexões de feedback temporal e auto-laços de memória.
3. **Long Short-Term Memory (LSTM)**: Células com portões lógicos de retenção sequencial.
4. **Autoencoder (AE)**: Gargalo latente para compressão e reconstrução de sinal.
5. **Deep Convolutional Network (DCN)**: Filtros convolucionais, mapas de pooling e classificação.
6. **Generative Adversarial Network (GAN)**: Competição entre Gerador sintético e Discriminador.
7. **Deep Residual Network (DRN)**: Conexões de atalho (*skip connections*) para estabilização de gradiente.
8. **Hopfield Network (HN)**: Malha simétrica com memória associativa totalmente conectada.
9. **Neural Turing Machine (NTM)**: Controlador acoplado a uma fita externa de memória RAM.

### 🎯 3. Backpropagation Real (Treinamento XOR)
- Rede neural real com 2 entradas, 4 neurônios ocultos e 1 saída sigmoide.
- Otimização por **Gradient Descent** com cálculo analítico de derivadas e MSE Loss.
- **Mini-gráfico em tempo real** mostrando a curva de convergência de erro (vermelho → amarelo → verde).
- Slider para controle da taxa de aprendizado (*learning rate*).
- Parada automática inteligente ao atingir convergência (`Loss < 0.005`).

### ⏸️ 4. Modo Passo a Passo (Step Mode)
- Congele o fluxo contínuo para analisar cada sinapse individualmente.
- Destaque visual pulsante no neurônio receptor.
- **Narração pedagógica em tempo real**:
  > *"Entrada 1 disparou com ativação 0.82 → transmitiu sinal excitatório pelo peso +1.45 → Oculto H1-2 ativou com tanh → 0.74"*

### 🎨 5. Quatro Temas Visuais
- **⚡ Cyberpunk**: Azul profundo com neon verde e vermelho.
- **🟢 Matrix Code**: Tons fosforescentes de terminal hacker.
- **🧠 Bio-Neural**: Tons orgânicos sanguíneos e âmbar.
- **🌆 Vaporwave**: Ciano elétrico e magenta neon sobre fundo púrpura.

### 💾 6. Exportação e Importação de Estado
- **📸 Captura de Tela (PNG)**: Exportação em alta definição da cena 3D atual.
- **💾 Exportar Estado (JSON)**: Salva pesos sinápticos, ativações, câmera e arquitetura.
- **📂 Importar Estado (JSON)**: Restaura instantaneamente qualquer rede salva.

---

## 🎮 Controles e Interações 3D

| Ação | Controle |
|---|---|
| **Orbitar Câmera** | Clique e arraste com o botão esquerdo |
| **Mover Câmera (Pan)** | Clique e arraste com o botão direito (ou Shift + Arraste) |
| **Zoom Fluido** | Roda do mouse (ou pinça com 2 dedos no touchpad/mobile) |
| **Disparar Neurônio** | Clique simples sobre uma esfera |
| **Criar Novo Neurônio** | Clique duplo em qualquer espaço vazio |
| **Inspecionar Neurônio** | Passe o mouse sobre a esfera para abrir o *Tooltip* de telemetria |
| **Resetar Câmera** | Clique no botão de porcentagem de zoom (`100%`) |

---

## 🚀 Como Executar Localmente

Como o projeto utiliza **módulos ES nativos do JavaScript (ESM)** para carregar o Three.js via CDN, ele deve ser executado através de um servidor HTTP local simples:

### Opção 1: Usando Python (Recomendado)
```bash
# Clone o repositório
git clone https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
cd SEU-REPOSITORIO

# Inicie o servidor local
python -m http.server 8080
```
Abra o navegador em: **`http://localhost:8080`**

---

### Opção 2: Usando Node.js (npx serve)
```bash
npx serve .
```

---

### Opção 3: Extensão Live Server (VS Code)
Abra a pasta no **VS Code**, clique com o botão direito no arquivo `index.html` e selecione **"Open with Live Server"**.

---

## 🛠️ Tecnologias Utilizadas

- **[Three.js (r160)](https://threejs.org/)** — Renderização gráfica 3D acelerada por hardware via WebGL.
- **UnrealBloomPass & EffectComposer** — Pós-processamento de brilho bloom em tempo real.
- **CSS2DRenderer** — Projeção precisa de etiquetas de texto HTML em coordenadas espaciais 3D.
- **OrbitControls** — Navegação e física de câmera orbital.
- **Vanilla JavaScript (ES6+)** — Simulação matemática, Hebbian Learning, Backprop e manipulação do DOM sem frameworks pesados.
- **CSS3 Moderno** — Design glassmorphism com `backdrop-filter`, sliders customizados e responsividade.

---

## 📄 Licença

Este projeto está licenciado sob a licença **MIT** — consulte o arquivo [LICENSE](LICENSE) para obter mais detalhes.
