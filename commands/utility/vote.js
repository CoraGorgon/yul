const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { safeDeferReply, handleCommandError } = require('../../utils/responseHandler');
const { 
    StringSelectMenuBuilder,
    MessageFlags,
    ContainerBuilder,
    MediaGalleryBuilder
} = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('vote')
        .setDescription('vote for the bot'),

    run: async (client, interaction) => {
        try {
           
const container = new ContainerBuilder();


container.addSeparatorComponents((separator) => separator);

// 4. Controles de Reproducción (Playback)
const votar = new ActionRowBuilder().addComponents(
               
                new ButtonBuilder()
                    .setLabel("VOTE TOP.GG")
                    .setStyle(ButtonStyle.Link)
                    .setURL("https://top.gg/bot/1517975340549410816/vote")
                    .setEmoji("<:meowcheckmark:1520945671358644385>")
            

);

container.addTextDisplayComponents((text) => text.setContent('### 🐈 VOTE'));
container.addActionRowComponents(votar);
container.addSeparatorComponents((separator) => separator);

// 5. Controles de Librería (Library)
const nosewe = new ActionRowBuilder().addComponents(
     new ButtonBuilder()
                    .setLabel("Invite")
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.com/oauth2/authorize?client_id=1517975340549410816&permissions=281474980153408&integration_type=0&scope=bot`)
                    .setEmoji("<:Shooting_Stars:935305026048495638>"),
                new ButtonBuilder()
                    .setLabel("Support Server")
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.gg/j48GBxpXxE`)
                    .setEmoji("<:Kawaii_Moon_and_Stars:935305070852050965>"),
);

container.addTextDisplayComponents((text) => text.setContent('### 🐈‍⬛YUL'));
container.addActionRowComponents(nosewe);
container.addSeparatorComponents((separator) => separator);


// 7. Sugerencias (Try...)
// Nota: Para que los comandos se vean azules y clickeables en Discord, necesitas los IDs reales de tus comandos.

// 8. Cómo enviarlo

await interaction.reply({
    components: [container],
    flags: MessageFlags.IsComponentsV2 // Este flag es obligatorio para que funcione el Container
});

            

        } catch (e) {
            return handleCommandError(
                interaction,
                e,
                'Error',
                `<a:3516scubbacat:1518088973845532862> \`|\` Hubo un error!! ${e}`
            );
        }
    },
};