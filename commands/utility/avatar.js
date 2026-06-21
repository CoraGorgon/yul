const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder } = require('discord.js');
const { safeDeferReply, handleCommandError } = require('../../utils/responseHandler');
const { default: axios } = require('axios');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('get yout avatar')
    .addUserOption(option => 
            option.setName('user')
                .setDescription('Selecciona al usuario para ver su avatar')),

  run: async (client, interaction) => {
    try {
     
          const user = interaction.options.getUser('user') || interaction.user;
        const member = interaction.guild.members.cache.get(user.id);

        // Definimos los botones
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("global_btn")
                .setLabel("Global Avatar")
                .setStyle(ButtonStyle.Primary)
                .setEmoji("<a:d_wing1:995836774150586448>"),
            new ButtonBuilder()
                .setCustomId("server_btn")
                .setLabel("Server Avatar")
                .setStyle(ButtonStyle.Primary)
                .setEmoji("<a:d_wing2:995836742655557642>")
        );

        

        // Obtenemos las URLs
        const globalAvatar = user.displayAvatarURL({ dynamic: true, size: 4096 });
        const serverAvatar = member?.displayAvatarURL({ dynamic: true, size: 4096 });

        // Verificamos si tiene avatar de servidor
        if (!member || !member.avatar) {
            return await interaction.reply({ 
                content: `<:AriSip_ByMel:936865163057958913> | Avatar de ${user.tag}`, 
                files: [new AttachmentBuilder(globalAvatar)] 
            });
        }

        // Si tiene ambos, enviamos con botones
        const response = await interaction.reply({ 
            content: `<:AriSip_ByMel:936865163057958913> | Avatar de ${user.tag}`, 
            files: [new AttachmentBuilder(serverAvatar)], 
            components: [row],
            fetchReply: true
        });

        const collector = response.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 60000 
        });

        collector.on("collect", async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: "Este menú no es tuyo.", ephemeral: true });
            }

            const newAvatar = (i.customId === "global_btn") ? globalAvatar : serverAvatar;
            await i.update({ 
                files: [new AttachmentBuilder(newAvatar)] 
            });
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