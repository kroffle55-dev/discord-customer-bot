const { 
  Client, 
  GatewayIntentBits, 
  Events, 
  EmbedBuilder, 
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle 
} = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: ['CHANNEL']
});

// --- 채널 ID 설정 ---
const GENERAL_INQUIRY_LOG_CHANNEL_ID = '1428277669409067120'; // 일반 문의 로그 채널
const PRODUCT_PURCHASE_LOG_CHANNEL_ID = '1428345973993898054'; // 상품 구매 로그 채널

// --- 임베드 색상 설정 ---
const EMBED_COLORS = {
  DEFAULT: '#000000',
  SUCCESS: '#57F287',
  ERROR: '#ED4245',
  INFO: '#5865F2',
  WARNING: '#FEE75C'
};

// --- 헬퍼 함수: DM으로 임베드 전송 ---
async function sendDmEmbed(userId, title, description, color = EMBED_COLORS.DEFAULT) {
  try {
    const user = await client.users.fetch(userId);
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setFooter({ text: '⚡️AP | 에이피 베이프' })
      .setTimestamp();
    await user.send({ embeds: [embed] });
  } catch (error) {
    console.error(`[DM 전송 실패] User ID: ${userId}, Error: ${error.message}`);
    // DM 발송 실패 시 추가적인 처리가 필요하다면 여기에 작성 (예: 특정 채널에 로그 남기기)
  }
}

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.content === '.고객센터설치') {
    const embed = new EmbedBuilder()
      .setTitle('⚡️에이피 고객센터')
      .setDescription('안녕하십니까, 에이피 입니다.\n접수시 지원팀이 신속히 도와드리겠습니다.\n감사합니다.')
      .setFooter({ text: '⚡️AP | 에이피 베이프' })
      .setColor(EMBED_COLORS.DEFAULT);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('open_inquiry_selector')
        .setLabel('ℹ️ 문의하기')
        .setStyle(ButtonStyle.Secondary)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;

  // --- 문의 유형 선택 ---
  if (interaction.isButton() && interaction.customId === 'open_inquiry_selector') {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_inquiry_type')
      .setPlaceholder('문의 유형을 선택하세요.')
      .addOptions([
        { label: '🛒 상품구매', description: '상품 구매를 위한 주문서를 작성합니다.', value: 'product_purchase' },
        { label: '💬 일반문의', description: '서비스 관련 일반 문의를 작성합니다.', value: 'general_inquiry' },
      ]);
    const row = new ActionRowBuilder().addComponents(selectMenu);
    await interaction.reply({ content: '원하시는 문의 유형을 선택해주세요.', components: [row], ephemeral: true });
  }

  // --- 선택에 따른 모달 표시 ---
  if (interaction.isStringSelectMenu() && interaction.customId === 'select_inquiry_type') {
    const selectedType = interaction.values[0];

    if (selectedType === 'general_inquiry') {
      const modal = new ModalBuilder().setCustomId('modal_support').setTitle('일반 문의 접수하기');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('subject').setLabel("제목").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('content').setLabel("내용").setStyle(TextInputStyle.Paragraph).setRequired(true))
      );
      await interaction.showModal(modal);
    } else if (selectedType === 'product_purchase') {
      const modal = new ModalBuilder().setCustomId('modal_purchase').setTitle('상품 구매 접수하기');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('purchase_product_name').setLabel("상품명").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('purchase_name').setLabel("성함").setStyle(TextInputStyle.Short).setRequired(true).setMinLength(2).setMaxLength(3)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('purchase_phone').setLabel("전화번호").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('"-" 제외 후 입력 바랍니다.')),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('purchase_address').setLabel("배송지 정보").setStyle(TextInputStyle.Paragraph).setRequired(true).setPlaceholder('배송지 상세주소, 배송 요구사항 기입'))
      );
      await interaction.showModal(modal);
    }
  }

  // --- 일반 문의 모달 제출 ---
  if (interaction.isModalSubmit() && interaction.customId === 'modal_support') {
    const subject = interaction.fields.getTextInputValue('subject');
    const content = interaction.fields.getTextInputValue('content');
    await interaction.reply({ content: '✅ 문의가 정상적으로 접수되었습니다.', ephemeral: true });

    const logChannel = await client.channels.fetch(GENERAL_INQUIRY_LOG_CHANNEL_ID);
    const embed = new EmbedBuilder()
      .setTitle('📥 새 문의 접수됨')
      .setDescription(`**${subject}**\n${content}\n\nby <@${interaction.user.id}>`)
      .setFooter({ text: '⚡️AP | 에이피 베이프' })
      .setColor(EMBED_COLORS.DEFAULT);
    const adminRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId(`admin_action_general_${interaction.user.id}`).setPlaceholder('답변 작업관리').addOptions([
        { label: '✅️ 답변등록', value: `reply_${interaction.user.id}`, description: '문의 답변 등록하기' },
        { label: '🔴 반려처리', value: `delete_${interaction.user.id}`, description: '문의 삭제처리 하기' }
      ])
    );
    await logChannel.send({ embeds: [embed], components: [adminRow] });
  }

  // --- 상품 구매 모달 제출 ---
  if (interaction.isModalSubmit() && interaction.customId === 'modal_purchase') {
    const purchaseData = {
      productName: interaction.fields.getTextInputValue('purchase_product_name'),
      name: interaction.fields.getTextInputValue('purchase_name'),
      phone: interaction.fields.getTextInputValue('purchase_phone'),
      address: interaction.fields.getTextInputValue('purchase_address'),
    };
    await interaction.reply({ content: '✅ 상품 구매 요청이 정상적으로 접수되었습니다. DM을 확인해주세요.', ephemeral: true });
    
    // 유저에게 계좌번호 DM 발송
    await sendDmEmbed(interaction.user.id, '🛒 상품 구매 신청 완료', '신청해주셔서 감사합니다.\n아래 계좌로 입금 후 잠시만 기다려주세요.\n\n`[은행명] 1234-5678-90123 (예금주: 에이피)`', EMBED_COLORS.INFO);

    const logChannel = await client.channels.fetch(PRODUCT_PURCHASE_LOG_CHANNEL_ID);
    const hiddenData = JSON.stringify(purchaseData);
    const embed = new EmbedBuilder()
      .setTitle('🛒 상품구매 리퀘스트')
      .addFields(
        { name: '신청자', value: `<@${interaction.user.id}> (\`${interaction.user.tag}\`)`, inline: false },
        { name: '상품명', value: purchaseData.productName, inline: false },
        { name: '성함', value: purchaseData.name, inline: true },
        { name: '전화번호', value: purchaseData.phone, inline: true },
        { name: '배송지 정보', value: `\`\`\`${purchaseData.address}\`\`\``, inline: false },
      )
      .setColor(EMBED_COLORS.INFO)
      .setFooter({ text: '⚡️AP | 에이피 베이프' })
      .setDescription(`\n**[숨겨진 주문 정보]**\n\`\`\`json\n${hiddenData}\n\`\`\``);

    const purchaseAdminRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId(`admin_action_purchase_${interaction.user.id}`).setPlaceholder('주문 작업관리').addOptions([
        { label: '✅ 접수완료', value: `confirm_${interaction.user.id}` },
        { label: '❌ 주문취소', value: `cancel_${interaction.user.id}` }
      ])
    );
    await logChannel.send({ embeds: [embed], components: [purchaseAdminRow] });
  }

  // --- 일반문의 관리자 액션 ---
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('admin_action_general_')) {
    const [action, userId] = interaction.values[0].split('_');
    if (action === 'reply') {
      const modal = new ModalBuilder().setCustomId(`modal_reply_${userId}`).setTitle('답변 작성');
      modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reply_content').setLabel("내용").setStyle(TextInputStyle.Paragraph).setRequired(true)));
      await interaction.showModal(modal);
    } else if (action === 'delete') {
      await interaction.message.delete();
      await interaction.reply({ content: '해당 문의를 반려처리했습니다.', ephemeral: true });
      await sendDmEmbed(userId, '🔴 문의 반려', '귀하께서 접수하신 문의사항이 반려 처리되었습니다.\n감사합니다.', EMBED_COLORS.ERROR);
    }
  }

  // --- 상품구매 관리자 액션 (접수/취소) ---
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('admin_action_purchase_')) {
    const [action, userId] = interaction.values[0].split('_');
    const originalEmbed = interaction.message.embeds[0];
    
    if (action === 'confirm') {
      const newDropdown = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId(`admin_action_shipping_${userId}`).setPlaceholder('배송 작업관리').addOptions([
          { label: '🚚 배송완료', value: `shipped_${userId}` }
        ])
      );
      await interaction.update({ components: [newDropdown] });
      await sendDmEmbed(userId, '✅ 주문 접수 완료', '주문이 정상적으로 접수되었습니다.\n상품 준비 후 배송이 시작될 예정입니다.', EMBED_COLORS.SUCCESS);
    } else if (action === 'cancel') {
      await interaction.message.delete();
      await interaction.reply({ content: '해당 주문을 취소 처리했습니다.', ephemeral: true });
      await sendDmEmbed(userId, '❌ 주문 취소', '귀하의 상품 주문이 취소되었습니다.', EMBED_COLORS.ERROR);
    }
  }

  // --- 상품구매 관리자 액션 (배송완료) ---
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('admin_action_shipping_')) {
    const [action, userId] = interaction.values[0].split('_');
    if (action === 'shipped') {
        const originalEmbed = interaction.message.embeds[0];
        try {
            const jsonString = originalEmbed.description.match(/```json\n([\s\S]*?)\n```/)[1];
            const purchaseData = JSON.parse(jsonString);

            const dmDescription = `고객님께서 주문하신 상품의 배송이 완료되었습니다.\n이용해주셔서 감사합니다.\n\n` +
                                  `> **주문 내역**\n` +
                                  `> **상품명:** ${purchaseData.productName}\n` +
                                  `> **성함:** ${purchaseData.name}\n` +
                                  `> **배송지:** ${purchaseData.address}`;

            await sendDmEmbed(userId, '🚚 상품이 안전하게 배송 완료되었습니다.', dmDescription, EMBED_COLORS.SUCCESS);
            await interaction.reply({ content: '배송 완료 처리 후 사용자에게 DM을 전송했습니다.', ephemeral: true });
            await interaction.message.delete();

        } catch (e) {
            console.error("배송 완료 처리 중 오류:", e);
            await interaction.reply({ content: '오류: 배송 완료 처리 중 문제가 발생했습니다.', ephemeral: true });
        }
    }
  }

  // --- 답변 모달 제출 ---
  if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_reply_')) {
    const userId = interaction.customId.split('_')[2];
    const replyContent = interaction.fields.getTextInputValue('reply_content');
    await interaction.message.delete();
    await interaction.reply({ content: '✅ 답변이 등록되었습니다.', ephemeral: true });
    await sendDmEmbed(userId, '🟢 문의에 대한 답변이 도착했습니다!', replyContent, EMBED_COLORS.SUCCESS);
  }
});

client.login(process.env.TOKEN);

// --- Koyeb용 웹 서버 ---
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Bot is running!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));