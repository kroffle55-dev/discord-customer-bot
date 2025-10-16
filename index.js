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
  TextInputStyle,
  ChannelType
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

// --- 설정 ---
const GENERAL_INQUIRY_LOG_CHANNEL_ID = '1428277669409067120';
const PRODUCT_PURCHASE_LOG_CHANNEL_ID = '1428345973993898054';
const LIVE_CHAT_CATEGORY_ID = '1428389947584418024'; // 사용자가 제공한 카테고리 ID
const LIVE_CHAT_ADMIN_ROLES = ['1379505785725517976', '1379505546172039188']; 

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
    const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setFooter({ text: '⚡️AP | 에이피 베이프' }).setTimestamp();
    await user.send({ embeds: [embed] });
  } catch (error) {
    console.error(`[DM 전송 실패] User ID: ${userId}, Error: ${error.message}`);
  }
}

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.content === '.고객센터설치') {
    const embed = new EmbedBuilder().setTitle('⚡️에이피 고객센터').setDescription('안녕하십니까, 에이피 입니다.\n접수시 지원팀이 신속히 도와드리겠습니다.\n감사합니다.').setFooter({ text: '⚡️AP | 에이피 베이프' }).setColor(EMBED_COLORS.DEFAULT);
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('open_inquiry_selector').setLabel('ℹ️ 문의하기').setStyle(ButtonStyle.Secondary));
    await message.channel.send({ embeds: [embed], components: [row] });
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;

  // --- 문의 유형 선택 드롭다운 ---
  if (interaction.isButton() && interaction.customId === 'open_inquiry_selector') {
    const selectMenu = new StringSelectMenuBuilder().setCustomId('select_inquiry_type').setPlaceholder('문의 유형을 선택하세요.').addOptions(
        { label: '💳 상품구매', description: '상품 구매신청', value: 'product_purchase' },
        { label: 'ℹ️ 서비스 문의', description: '서비스 관련 문의 작성', value: 'general_inquiry' },
        { label: '💬 라이브챗', description: '실시간 채팅 상담', value: 'live_chat' },
    );
    const row = new ActionRowBuilder().addComponents(selectMenu);
    await interaction.reply({ content: '원하시는 문의 유형을 선택해주세요.', components: [row], ephemeral: true });
  }

  // --- 선택에 따른 모달 표시 ---
  if (interaction.isStringSelectMenu() && interaction.customId === 'select_inquiry_type') {
    const selectedType = interaction.values[0];
    if (selectedType === 'general_inquiry') {
        const modal = new ModalBuilder().setCustomId('modal_support').setTitle('서비스 문의 접수하기');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('subject').setLabel("제목").setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('content').setLabel("내용").setStyle(TextInputStyle.Paragraph).setRequired(true)));
        await interaction.showModal(modal);
    } else if (selectedType === 'product_purchase') {
        const modal = new ModalBuilder().setCustomId('modal_purchase').setTitle('상품 구매 접수하기');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('purchase_product_name').setLabel("상품명").setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('purchase_name').setLabel("성함").setStyle(TextInputStyle.Short).setRequired(true).setMinLength(2).setMaxLength(3)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('purchase_phone').setLabel("전화번호").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('"-" 제외 후 입력 바랍니다.')), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('purchase_address').setLabel("배송지 정보").setStyle(TextInputStyle.Paragraph).setRequired(true).setPlaceholder('배송지 상세주소, 배송 요구사항 기입')));
        await interaction.showModal(modal);
    } else if (selectedType === 'live_chat') {
        const modal = new ModalBuilder().setCustomId('modal_livechat').setTitle('라이브챗 문의하기');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('livechat_title').setLabel("제목").setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('livechat_content').setLabel("문의내용").setStyle(TextInputStyle.Paragraph).setRequired(true)));
        await interaction.showModal(modal);
    }
  }

  // --- 라이브챗 모달 제출 ---
  if (interaction.isModalSubmit() && interaction.customId === 'modal_livechat') {
    const title = interaction.fields.getTextInputValue('livechat_title');
    const content = interaction.fields.getTextInputValue('livechat_content');
    const sanitizedUsername = interaction.member.displayName.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase() || interaction.user.username;
    const channelName = `라이브챗-${sanitizedUsername}`;

    try {
        await interaction.reply({ content: '라이브챗 채널을 생성 중입니다...', ephemeral: true });

        const category = await interaction.guild.channels.fetch(LIVE_CHAT_CATEGORY_ID).catch(() => null);
        if (!category || category.type !== ChannelType.GuildCategory) {
            console.error(`[오류] 라이브챗 카테고리 ID('${LIVE_CHAT_CATEGORY_ID}')가 잘못되었거나 존재하지 않습니다.`);
            await interaction.editReply({ content: '❌ 오류: 라이브챗 채널을 생성하는 데 실패했습니다. 관리자가 카테고리 설정을 확인해야 합니다.' });
            return;
        }

        const permissionOverwrites = [
            { id: interaction.guild.id, deny: ['ViewChannel'] },
            { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
        ];
        LIVE_CHAT_ADMIN_ROLES.forEach(roleId => {
            permissionOverwrites.push({ id: roleId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages'] });
        });

        const channel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: category,
            permissionOverwrites: permissionOverwrites,
        });

        await interaction.editReply({ content: `✅ 라이브챗이 성공적으로 생성되었습니다: ${channel}` });

        const embed = new EmbedBuilder().setTitle(`라이브챗 - ${interaction.member.displayName}`).setDescription(`라이브챗 문의가 시작되었습니다.\n\n**${title}**\n${content}`).setColor(EMBED_COLORS.INFO).setFooter({ text: '⚡️AP | 에이피 베이프' });
        const closeButton = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_livechat').setLabel('라이브챗 종료').setStyle(ButtonStyle.Danger));
        const adminPing = LIVE_CHAT_ADMIN_ROLES.map(id => `<@&${id}>`).join(' ');
        await channel.send({ content: `${adminPing}, 새로운 라이브챗 문의가 도착했습니다.`, embeds: [embed], components: [closeButton] });

    } catch (error) {
        console.error("라이브챗 채널 생성 실패:", error);
        await interaction.editReply({ content: '❌ 오류: 라이브챗 채널을 생성하는 데 실패했습니다. 봇 로그를 확인해주세요.' });
    }
  }

  // --- 라이브챗 종료 ---
  if (interaction.isButton() && interaction.customId === 'close_livechat') {
      if (interaction.channel.name.startsWith('라이브챗-')) {
          await interaction.reply({ content: '5초 후 이 채널을 삭제합니다.', ephemeral: false });
          setTimeout(() => interaction.channel.delete().catch(console.error), 5000);
      } else {
          await interaction.reply({ content: '이 버튼은 라이브챗 채널에서만 사용할 수 있습니다.', ephemeral: true });
      }
  }

  // --- 일반 문의 모달 제출 ---
  if (interaction.isModalSubmit() && interaction.customId === 'modal_support') {
    const subject = interaction.fields.getTextInputValue('subject');
    const content = interaction.fields.getTextInputValue('content');
    await interaction.reply({ content: '✅ 문의가 정상적으로 접수되었습니다.', ephemeral: true });
    const logChannel = await client.channels.fetch(GENERAL_INQUIRY_LOG_CHANNEL_ID);
    const embed = new EmbedBuilder().setTitle('📥 새 문의 접수됨').setDescription(`**${subject}**\n${content}\n\nby <@${interaction.user.id}>`).setFooter({ text: '⚡️AP | 에이피 베이프' }).setColor(EMBED_COLORS.DEFAULT);
    const adminRow = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`admin_action_general_${interaction.user.id}`).setPlaceholder('답변 작업관리').addOptions([{ label: '✅️ 답변등록', value: `reply_${interaction.user.id}` }, { label: '🔴 반려처리', value: `delete_${interaction.user.id}` }]));
    await logChannel.send({ embeds: [embed], components: [adminRow] });
  }

  // --- 상품 구매 모달 제출 ---
  if (interaction.isModalSubmit() && interaction.customId === 'modal_purchase') {
    const purchaseData = { productName: interaction.fields.getTextInputValue('purchase_product_name'), name: interaction.fields.getTextInputValue('purchase_name'), phone: interaction.fields.getTextInputValue('purchase_phone'), address: interaction.fields.getTextInputValue('purchase_address') };
    await interaction.reply({ content: '✅ 구매 요청이 정상적으로 접수되었습니다.\nDM으로 입금계좌가 전송되었습니다.', ephemeral: true });
    await sendDmEmbed(interaction.user.id, '가상계좌 입금안내', '아래 입금계좌로 송금해주시기 바랍니다.\n- 은행명\n``SC제일``\n- 계좌번호\n``라이브챗 문의``\n- 예금주\n``라이브챗 문의``\n-# 입금계좌는 수시로 변동됩니다. 오송금시 환불 불가입니다.\n-# 해당 계좌는 24시간 추적되고 있습니다.\n-# 금융범죄 (3자사기등)에 사용시 즉시 금감원에 보고되며 민형사상 처벌을 받을수 있습니다.', EMBED_COLORS.INFO);
    const logChannel = await client.channels.fetch(PRODUCT_PURCHASE_LOG_CHANNEL_ID);
    const hiddenData = JSON.stringify(purchaseData);
    const embed = new EmbedBuilder().setTitle('🟢 상품구매 리퀘스트').addFields({ name: '신청자', value: `<@${interaction.user.id}> (\`${interaction.user.tag}\`)` }, { name: '상품명', value: purchaseData.productName }, { name: '성함', value: purchaseData.name, inline: true }, { name: '전화번호', value: purchaseData.phone, inline: true }, { name: '배송지 정보', value: `\`\`\`${purchaseData.address}\`\`\`` }).setColor(EMBED_COLORS.INFO).setFooter({ text: '⚡️AP | 에이피 베이프' }).setDescription(`\n**[숨겨진 주문 정보]**\n\`\`\`json\n${hiddenData}\n\`\`\``);
    const purchaseAdminRow = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`admin_action_purchase_${interaction.user.id}`).setPlaceholder('주문 작업관리').addOptions([{ label: '✅ 접수완료', value: `confirm_${interaction.user.id}` }, { label: '❌ 주문취소', value: `cancel_${interaction.user.id}` }]));
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
        await interaction.reply({ content: '귀하의 문의사항에 대한 답변 등록', ephemeral: true });
        await sendDmEmbed(userId, '문의 반려처리됨.', '자세한 사항은 고객센터 문의 바랍니다.\n감사합니다.', EMBED_COLORS.ERROR);
    }
  }

  // --- 상품구매 관리자 액션 (접수/취소) ---
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('admin_action_purchase_')) {
    const [action, userId] = interaction.values[0].split('_');
    if (action === 'confirm') {
        const newDropdown = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`admin_action_shipping_${userId}`).setPlaceholder('배송 작업관리').addOptions([{ label: '🟢 배송완료', value: `shipped_${userId}` }]));
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
            const dmDescription = `고객님께서 주문하신 상품의 배송이 완료되었습니다.\n이용해주셔서 감사합니다.\n\n> **주문 내역**\n> **상품명:** ${purchaseData.productName}\n> **성함:** ${purchaseData.name}\n> **배송지:** ${purchaseData.address}`;
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
    await sendDmEmbed(userId, '🟢 문의에 대한 답변 등록이 완료되었습니다.', replyContent, EMBED_COLORS.SUCCESS);
  }
});

client.login(process.env.TOKEN);

// --- Koyeb용 웹 서버 ---
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Bot is running!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));