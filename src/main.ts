// ===============================
// IMPORTAÇÕES
// ===============================
// stdin  -> entrada do terminal
// stdout -> saída do terminal
// createInterface permite criar perguntas no terminal
// readFile  -> lê arquivos
// writeFile -> escreve arquivos
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { readFile, writeFile } from "node:fs/promises";

// INTERFACE

// Interface define o formato do objeto que será utilizado no programa.
// Isso ajuda o TypeScript a validar as propriedades existentes tipos corretos e autocomplete

interface UsuarioGithub {
    // ID único do usuário no Github
    id: number;
    // Username do Github
    login: string;
    // Nome do usuário pode ser null caso não exista
    name: string | null;
    // Link do perfil
    html_url: string;
}

// CONSTANTES

// Caminho do arquivo onde os usuários serão salvos
const CAMINHO_ARQUIVO = "./database.json";
// URL base da API do Github
const URL_API = "https://api.github.com/users/";

// INTERFACE DO TERMINAL

// Cria a interface de comunicação com o terminal.

const rl = createInterface({
    input: stdin,// input  -> recebe dados digitados
    output: stdout,// output -> mostra mensagens
});

// FUNÇÃO DE VALIDAÇÃO

// Recebe um username digitado e valida se ele é válido
function validarUsername(username: string): string {
    // trim() remove espaços antes/depois
    const usernameTratado = username.trim();
    // Verifica se ficou vazio
    if (!usernameTratado) {
        // throw interrompe a execução e envia um erro
        throw new Error("Digite um nome de usuário.");
    }
    // Regex utilizada para validar usernames do Github
    // Regras: letras - números - hífen - sem espaços - sem hífen duplo - sem hífen no início/fim
    const regex = /^(?!.*--)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

    // test() verifica se o texto atende a regex
    if (!regex.test(usernameTratado)) {
        throw new Error("Username inválido.");
    }
    // retorna username validado
    return usernameTratado;
}

// BUSCA USUÁRIO NA API
// async -> função assíncrona
// Promise<UsuarioGithub> significa que a função retornará um objeto UsuarioGithub
async function buscarUsuarioGithub(
    username: string
): Promise<UsuarioGithub> {

    // fetch faz requisição HTTP, Exemplo: https://api.github.com/users/eumesmo
    const response = await fetch(`${URL_API}${username}`);

    // status 404 = usuário não encontrado
    if (response.status === 404) {
        throw new Error(`Usuário "${username}" não encontrado.`);
    }

    // response.ok verifica se a requisição foi bem sucedida equivalente a: status >= 200 && status < 300
    if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
    }

    // response.json() converte JSON da API em objeto JavaScript
    const usuario: UsuarioGithub = await response.json();

    // retorna apenas os campos
    // necessários
    return {

        id: usuario.id,

        login: usuario.login,

        name: usuario.name,

        html_url: usuario.html_url,
    };
}

// LEITURA DO ARQUIVO

// Lê database.json 
// Retorna um array de usuários
async function obterUsuariosSalvos(): Promise<UsuarioGithub[]> {

    try {
        // Lê arquivo como UTF-8
        const dadosArquivo = await readFile(
            CAMINHO_ARQUIVO,
            "utf-8"
        );
        // JSON.parse transforma: texto JSON em: objeto/array JavaScript
        return JSON.parse(dadosArquivo);
    } catch (error: any) {
        
        // ENOENT significa: "arquivo não existe"        
        if (error.code === "ENOENT") {

            // retorna array vazio
            return [];
        }

        // outros erros
        throw new Error(
            "Não foi possível ler o arquivo."
        );
    }
}

// Verifica se usuário já existe
function verificarUsuarioDuplicado(
    usuarios: UsuarioGithub[],
    idUsuario: number

): boolean {
    // some() retorna true caso encontre algum item compatível
    return usuarios.some(
        (usuario) => usuario.id === idUsuario
    );
}

// SALVA USUÁRIO
// Salva usuário no arquivo JSON
async function salvarUsuario(
    usuario: UsuarioGithub
): Promise<void> {

    // Busca usuários já salvos
    const usuariosSalvos = await obterUsuariosSalvos();

    // Verifica duplicidade
    const usuarioExiste = verificarUsuarioDuplicado(usuariosSalvos, usuario.id);

    // Se já existir
    if (usuarioExiste) {

        console.log("\nO usuário já está cadastrado no arquivo.");

        return;
    }

    // push adiciona item no array
    usuariosSalvos.push(usuario);

    // writeFile sobrescreve o arquivo com os dados atualizados
    await writeFile(
        // null, 2 formata o JSON deixando legível
        CAMINHO_ARQUIVO, JSON.stringify(usuariosSalvos, null, 2), "utf-8"
        
    );

    console.log("\nO usuário foi salvo na base de dados com sucesso.");
}

// FUNÇÃO DE PERGUNTA

// Função reutilizável para perguntas no terminal
async function perguntar(
    mensagem: string
): Promise<string> {

    return rl.question(mensagem);
}

// FUNÇÃO PRINCIPAL

// Controla fluxo principal
async function executar(): Promise<void> {

    try {

        console.log("\n===== BUSCA GITHUB =====\n");

        // Pergunta username
        const entradaUsuario =
            await perguntar(
                "Informe o username do Github:\n> "
            );

        // Valida username
        const username =
            validarUsername(entradaUsuario);

        // Busca usuário na API
        const usuario =
            await buscarUsuarioGithub(username);

        // Mostra usuário encontrado
        console.log("\nUsuário encontrado:\n");

        console.log(`Login : ${usuario.login}`);

        console.log(`Nome  : ${usuario.name ?? "Não informado"}`);
        
        console.log(`Perfil: ${usuario.html_url}`);

        // Pergunta se deseja salvar
        const respostaSalvar =
            await perguntar("\nDeseja salvar este usuário? (S/N)\n> ");

        // trim() remove espaços
        // toUpperCase() converte para maiúsculo
        const desejaSalvar =
            respostaSalvar.trim().toUpperCase();

        // Se diferente de S
        if (desejaSalvar !== "S") {

            console.log("\nOperação cancelada.");

            return;
        }

        // Salva usuário
        await salvarUsuario(usuario);

    } catch (error: any) {

        // Captura qualquer erro
        console.log("\nErro:");

        console.log(error.message);

    } finally {
        // finally sempre executa
        // Fecha interface do terminal
        rl.close();
    }
}

// INICIA O PROGRAMA

executar();