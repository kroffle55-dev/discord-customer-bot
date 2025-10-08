require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

require("./server");

// 관리자 역할 ID
const 관리자역할ID = "1423885093310566421";

// 관리자 채널 ID
const 관리자채널ID = "1425412015198965872"; // 여기에 관리자 채널 ID 입력

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  const isAdmin = message.member?.roles?.cache?.has(관리자역할ID);
  if (!isAdmin) return;

  if (message.content === ".고객센터설치") {
    const embed = new EmbedBuilder()
      .setTitle("고객센터")
      .setDescription("고객센터 설명입력")
      .setColor(0x00BFFF);

    const button = new ButtonBuilder()
      .setLabel("문의접수")
      .setStyle(ButtonStyle.Primary)
      .setCustomId("open_form");

    const row = new ActionRowBuilder().addComponents(button);

    await message.channel.send({ embeds: [embed], components: [row] });
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton() && interaction.customId === "open_form") {
    const modal = new ModalBuilder()
      .setCustomId("submit_form")
      .setTitle("문의 접수");

    const titleInput = new TextInputBuilder()
      .setCustomId("title")
      .setLabel("제목")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const contentInput = new TextInputBuilder()
      .setCustomId("content")
      .setLabel("내용")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const row1 = new ActionRowBuilder().addComponents(titleInput);
    const row2 = new ActionRowBuilder().addComponents(contentInput);

    modal.addComponents(row1, row2);

    await interaction.showModal(modal);
  }

  if (interaction.isButton() && interaction.customId.startsWith("reply_to_user")) {
    const targetUserId = interaction.customId.split(":")[1];

    const modal = new ModalBuilder()
      .setCustomId(`submit_reply:${interaction.message.id}:${targetUserId}`)
      .setTitle("응답 작성");

    const titleInput = new TextInputBuilder()
      .setCustomId("reply_title")
      .setLabel("제목")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const contentInput = new TextInputBuilder()
      .setCustomId("reply_content")
      .setLabel("내용")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const row1 = new ActionRowBuilder().addComponents(titleInput);
    const row2 = new ActionRowBuilder().addComponents(contentInput);

    modal.addComponents(row1, row2);

    await interaction.showModal(modal);
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === "submit_form") {
      const title = interaction.fields.getTextInputValue("title");
      const content = interaction.fields.getTextInputValue("content");

      await interaction.reply({
        content: `문의가 접수되었습니다.\n**제목:** ${title}\n**내용:** ${content}`,
        ephemeral: true
      });

      const adminChannel = await client.channels.fetch(관리자채널ID);
      if (adminChannel && adminChannel.isTextBased()) {
        const embed = new EmbedBuilder()
          .setTitle(title)
          .addFields(
            { name: "\u200B", value: content },
            { name: "\u200B", value: "\u200B" }
          )
          .setColor(0x00BFFF);

        const button = new ButtonBuilder()
          .setLabel("✅️ 응답 작성하기")
          .setStyle(ButtonStyle.Primary)
          .setCustomId(`reply_to_user:${interaction.user.id}`);

        const row = new ActionRowBuilder().addComponents(button);

        await adminChannel.send({ embeds: [embed], components: [row] });
      }
    }

    if (interaction.customId.startsWith("submit_reply")) {
      const [_, messageId, targetUserId] = interaction.customId.split(":");
      const title = interaction.fields.getTextInputValue("reply_title");
      const content = interaction.fields.getTextInputValue("reply_content");

      try {
        const adminChannel = await client.channels.fetch(관리자채널ID);
        const originalMessage = await adminChannel.messages.fetch(messageId);
        await originalMessage.delete();
      } catch (err) {
        console.error("메시지 삭제 실패:", err);
      }

      try {
        const user = await client.users.fetch(targetUserId);
        const dmChannel = await user.createDM();

        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(content)
          .setColor(0x00BFFF);

        await dmChannel.send({ embeds: [embed] });

        await interaction.reply({
          content: "응답이 전송되었습니다.",
          ephemeral: true
        });
      } catch (err) {
        console.error("DM 전송 실패:", err);
        await interaction.reply({
          content: "DM을 보낼 수 없습니다. 사용자 설정을 확인해주세요.",
          ephemeral: true
        });
      }
    }
  }
});

client.login(process.env.TOKEN);
