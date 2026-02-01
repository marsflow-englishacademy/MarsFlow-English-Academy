// Configuração Firebase para Hub Gamificado Escolar
// Substitua com suas credenciais do Firebase

const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "SEU_AUTH_DOMAIN_AQUI",
    projectId: "SEU_PROJECT_ID_AQUI",
    storageBucket: "SEU_STORAGE_BUCKET_AQUI",
    messagingSenderId: "SEU_MESSAGING_SENDER_ID_AQUI",
    appId: "SEU_APP_ID_AQUI"
};

// Instruções para configurar o Firebase:

/*
1. Acesse https://console.firebase.google.com/
2. Clique em "Adicionar projeto"
3. Digite um nome como "hub-gamificado-escola"
4. Desative o Google Analytics (não é necessário para começar)
5. Clique em "Criar projeto"

6. Depois de criar o projeto, clique no ícone de engrenagem (⚙️) > "Configurações do projeto"
7. Na aba "Geral", role para baixo e clique no ícone </> para adicionar um app web
8. Registre o app com um nome como "hub-escolar"
9. Copie as credenciais que aparecem e substitua os valores acima

10. Ative o Authentication:
    - Vá para Authentication > Começar
    - Clique em "Email/Senha" e ative
    - Clique em "Salvar"

11. Configure o Firestore Database:
    - Vá para Firestore Database > Criar banco de dados
    - Escolha "Modo de teste" (permissivas para desenvolvimento)
    - Escolha a localização mais próxima (ex: southamerica-east1)
    - Clique em "Criar"

12. Configure o Storage:
    - Vá para Storage > Começar
    - Escolha "Modo de teste"
    - Clique em "Criar"

13. Copie as credenciais finais e cole aqui:
*/

// Após configurar, substitua os valores no index.html também
// Procure pela seção com "const firebaseConfig" e atualize