import json
COSTS=[1,1,1,1,2,2,2,2,2,3,3,3,3,3,4,4,4,4,5,5,5,6,6,7,8]
SIGNS={
'aries':('Fogo','investida',['perfurar','escudo'],"""Carneiro Ígneo|🐏;Pajem de Marte|🧒;Cabrito de Brasa|🐐;Batedor Rubro|🏃;Guerreira de Marte|⚔️;Lanceiro Ígneo|🔱;Corredor das Cinzas|🐎;Escudeiro Rubro|🛡️;Arauto do Combate|📯;Carneiro de Guerra|🐏;Duelista Flamejante|🤺;Domador de Brasas|🦎;Berserker Rubro|🪓;Sentinela do Vulcão|🌋;Cavaleiro de Marte|🐴;Campeã da Arena|🏆;Martelo Ígneo|🔨;Fênix Jovem|🦅;Campeão do Vulcão|🌋;General Rubro|🎖️;Carneiro Colossal|🐏;Titã das Brasas|🔥;Senhor da Guerra|👹;Marte Encarnado|☄️;Áries, o Carneiro Dourado|🐏""",
 [('Golpe Flamejante','💥',1,'dmg',2),('Grito de Guerra','📯',1,'buff',(2,0)),('Chuva de Brasas','🔥',3,'lane',2),('Fúria de Marte','😤',3,'buff',(3,1)),('Meteoro','☄️',5,'dmg',5)]),
'touro':('Terra','furia',['escudo','vampirico'],"""Bezerro Teimoso|🐂;Vaqueira do Vale|🤠;Coelho do Campo|🐇;Aprendiz de Ferreiro|⚒️;Guardião do Vale|🛡️;Boi de Arado|🐄;Pastor das Colinas|🧑‍🌾;Javali Robusto|🐗;Golem de Barro|🧱;Touro de Bronze|🐃;Ferreiro do Vale|🔨;Sentinela de Pedra|🗿;Búfalo Bravo|🐃;Guardiã dos Campos|🌾;Minotauro|🪓;Rinoceronte de Ferro|🦏;Colosso de Barro|🧱;Druida da Terra|🌳;Touro de Ouro|🐂;Guardião do Templo|🏛️;Mamute Ancestral|🦣;Colosso Taurino|🗿;Rei do Vale|👑;Gigante da Montanha|⛰️;Touro, o Indomável|🐂""",
 [('Pele de Bronze','🛡️',1,'shield',0),('Força da Terra','💪',2,'buff',(1,3)),('Banquete','🍖',2,'heal',5),('Chifrada','🐂',2,'dmg',3),('Terremoto','🌍',4,'lane',2)]),
'gemeos':('Ar','twin',['distancia','reflexo'],"""Gêmeo Travesso|🎭;Pardal Mensageiro|🐦;Menestrel|🎶;Pajem Curioso|🧒;Bardo dos Ventos|🪶;Duplo Sombrio|👥;Malabarista|🤹;Arqueiro Gêmeo|🏹;Contadora de Histórias|📖;Ilusionista Espelhado|🪞;Dançarina do Vento|💃;Mago das Palavras|📜;Raposa Astuta|🦊;Eco Errante|🌬️;Mestre dos Espelhos|🪞;Irmãos Acrobatas|🤸;Cronista Alado|🕊️;Trapaceiro|🃏;Castor e Pólux|♊;Guardião dos Ventos|🌪️;Arauto Duplo|📯;Grifo Mensageiro|🦅;Sábio Bifronte|🎭;Tempestade Gêmea|🌀;Gêmeos, o Duplo Eterno|♊""",
 [('Lâmina Gêmea','🗡️',1,'dmg',2),('Reflexo Espelhado','🪞',1,'shield',0),('Sopro Gêmeo','💨',1,'lane',1),('Truque Duplo','🃏',2,'draw',2),('Ventania Dupla','🌪️',3,'lane',2)]),
'cancer':('Água','carapaca',['escudo','vampirico'],"""Caranguejo Lunar|🦀;Concha Viva|🐚;Siri Guardião|🦀;Ostra Brilhante|🦪;Sentinela da Praia|🛡️;Tartaruguinha|🐢;Pescadora Lunar|🎣;Estrela-do-Mar|⭐;Lontra da Maré|🦦;Sentinela da Maré|🌙;Caranguejo Ermitão|🐚;Guardiã do Farol|🗼;Polvo Protetor|🐙;Sacerdotisa da Lua|🌕;Lagosta Couraçada|🦞;Matriarca da Costa|👵;Foca Guardiã|🦭;Tritão Jovem|🔱;Crustáceo Ancião|🐢;Guardião das Marés|🌊;Rainha das Conchas|👑;Kraken da Baía|🦑;Tartaruga Continente|🐢;Fortaleza Viva|🏰;Câncer, o Caranguejo Celeste|🦀""",
 [('Concha Lunar','🐚',1,'shield',0),('Pinça Cortante','🦀',2,'dmg',3),('Maré Alta','🌊',2,'buff',(0,4)),('Abraço da Lua','🌙',2,'heal',4),('Onda Lunar','🌊',4,'lane',2)]),
'leao':('Fogo','lideranca',['perfurar','escudo'],"""Filhote Solar|🐈;Pajem Real|👦;Leoa Batedora|🐆;Arauto Dourado|📯;Guarda do Sol|🦁;Leoa Caçadora|🐆;Escudeiro Real|🛡️;Porta-Estandarte|🚩;Lince Dourado|🐈;Leão da Savana|🦁;Capitã da Guarda|💂;Sacerdote Solar|☀️;Guerreiro Dourado|⚔️;Pantera Real|🐈‍⬛;Comandante Solar|🎖️;Leão Alado|🦁;Cavaleiro do Sol|🐴;Juba de Fogo|🔥;Rei da Savana|🦁;Paladino Solar|✨;Esfinge Guardiã|🗿;Monarca Solar|☀️;Leão de Nemeia|🦁;Imperador Dourado|👑;Leão, o Coração do Sol|🦁""",
 [('Bênção Solar','✨',1,'buff',(1,1)),('Raio de Sol','☀️',2,'dmg',3),('Glória','🏆',2,'heal',4),('Rugido','🦁',3,'buff',(2,2)),('Chamas Reais','🔥',5,'lane',3)]),
'virgem':('Terra','cura',['escudo','reflexo'],"""Jardineira|🌼;Abelha Operária|🐝;Aprendiz Herbalista|🌿;Coruja Sábia|🦉;Curandeira do Trigo|🌾;Guardiã do Pomar|🍎;Ervanária|🌱;Ceifeira|🌾;Monge Silencioso|🧘;Sacerdotisa da Colheita|🧝;Ent do Pomar|🌳;Médica do Vilarejo|🩺;Cervo Sagrado|🦌;Tecelã|🧵;Guardião do Celeiro|🏚️;Abelha Rainha|🐝;Druidesa|🍃;Unicórnio do Bosque|🦄;Mãe da Colheita|👩‍🌾;Árvore Anciã|🌳;Arquivista|📚;Guardiã Virgem|🛡️;Santuário Vivo|⛩️;Vestal Eterna|🕯️;Virgem, a Guardiã da Colheita|🌾""",
 [('Erva Curativa','🌿',1,'heal',4),('Escudo de Trigo','🌾',1,'shield',0),('Espinhos','🌵',1,'dmg',2),('Fortalecer','🍃',1,'buff',(1,2)),('Colheita','🧺',3,'draw',2)]),
'libra':('Ar','reflexo',['escudo','distancia'],"""Pajem da Balança|📜;Escriba|🪶;Pomba da Paz|🕊️;Mensageiro da Corte|📨;Juíza da Balança|⚖️;Guarda da Corte|💂;Advogado|📜;Duelista Justo|🤺;Cisne Elegante|🦢;Mediadora|🤝;Cavaleiro da Lei|🛡️;Harpista|🎻;Arcanjo Menor|😇;Guardiã do Equilíbrio|☯️;Guardião Justo|🏛️;Inquisidor|🔍;Embaixadora|🎀;Grifo da Justiça|🦅;Alta Juíza|⚖️;Paladino da Ordem|🛡️;Templo Vivo|🏛️;Arcanjo da Balança|😇;Conselheiro Ancião|🧙;Têmis, a Justa|⚖️;Libra, a Balança Cósmica|⚖️""",
 [('Selo da Lei','📜',1,'shield',0),('Equidade','☯️',1,'heal',3),('Peso Justo','⚖️',2,'dmg',3),('Contrapeso','🤝',3,'buff',(2,2)),('Julgamento','🔨',3,'lane',2)]),
'escorpiao':('Água','veneno',['vampirico','escudo'],"""Escorpião do Pântano|🦂;Aranha Tecelã|🕷️;Morcego Sombrio|🦇;Sapo Venenoso|🐸;Assassina Sombria|🗡️;Serpente do Lodo|🐍;Alquimista Tóxico|⚗️;Guardião do Lodo|🐊;Vespa Negra|🐝;Sacerdotisa do Lodo|🐍;Caçador Noturno|🌑;Escorpião Gigante|🦂;Bruxa do Pântano|🧙‍♀️;Centopeia Real|🐛;Naga Sombria|🐍;Feiticeiro Venenoso|☠️;Crocodilo Ancião|🐊;Viúva Negra|🕷️;Hidra do Pântano|🐉;Senhor das Sombras|🌑;Basilisco|🦎;Rei Escorpião|👑;Fênix Sombria|🦅;Rainha da Peçonha|🕸️;Escorpião, o Ferrão Eterno|🦂""",
 [('Ferroada','🦂',1,'poison',0),('Toxina','🧪',1,'dmg',2),('Pacto Sombrio','🌑',2,'draw',2),('Nuvem Tóxica','☁️',3,'lane',2),('Veneno Letal','☠️',3,'dmg',4)]),
'sagitario':('Fogo','distancia',['perfurar','investida'],"""Batedor Centauro|🐎;Aprendiz de Arqueiro|🏹;Falcão Caçador|🦅;Viajante|🧭;Arqueira Centaura|🏹;Lanceiro Errante|🔱;Rastreador|🐾;Corcel Veloz|🐎;Caçadora da Lua|🌙;Caçador de Estrelas|🌠;Centauro Guerreiro|🐎;Atiradora de Elite|🎯;Explorador|🗺️;Xamã das Planícies|🪶;Lanceiro Flamejante|🔥;Centauro Ancião|🧔;Arqueira Celeste|✨;Cavaleiro Nômade|🐴;General Centauro|🎖️;Caçadora Divina|🏹;Cometa Vivo|☄️;Quíron, o Mestre|🏇;Centauro de Guerra|⚔️;Atirador das Galáxias|🌌;Sagitário, o Arqueiro Celeste|🏹""",
 [('Flecha Certeira','🎯',1,'dmg',2),('Mira Estelar','✨',2,'buff',(3,0)),('Flecha Flamejante','🔥',2,'face',3),('Galope','🐎',2,'draw',2),('Chuva de Flechas','🏹',3,'lane',2)]),
'capricornio':('Terra','ascensao',['escudo','furia'],"""Cabrito da Montanha|🐐;Mineiro|⛏️;Marmota|🐿️;Aprendiz Monge|🧒;Escalador|🧗;Bode Teimoso|🐐;Guardião do Pico|🛡️;Águia das Rochas|🦅;Ferreira Anã|⚒️;Ermitão do Pico|🏔️;Golem de Gelo|🧊;Monge da Montanha|🧘;Íbex Real|🐐;Pastor das Alturas|🧑‍🌾;Yeti|🦍;Mestre Escalador|🧗;Sentinela Glacial|❄️;Cabra-Peixe Ancestral|🐟;Bode Ancestral|🦬;Gigante de Gelo|🧊;Abade da Montanha|⛪;Dragão da Montanha|🐉;Colosso Glacial|❄️;Patriarca do Pico|🏔️;Capricórnio, a Cabra-Marinha|🐐""",
 [('Muralha de Pedra','🧱',1,'shield',0),('Resiliência','⛰️',2,'buff',(1,3)),('Pedrada','🪨',2,'dmg',3),('Escalada','🧗',3,'buff',(2,2)),('Avalanche','❄️',5,'lane',3)]),
'aquario':('Ar','corrente',['distancia','escudo'],"""Sílfide da Brisa|🧚;Gota Viva|💧;Pássaro do Trovão|🐦;Estudante Arcano|📘;Portador da Ânfora|🏺;Mago do Vento|🌬️;Inventor|⚙️;Fada da Chuva|🌧️;Cometa Pequeno|☄️;Arauto da Tempestade|⛈️;Elemental de Água|💧;Astrônomo|🔭;Arcanista|📖;Golem Mecânico|🤖;Mestre dos Ventos|🌪️;Elemental do Raio|⚡;Sábio Excêntrico|🧪;Corvo Elétrico|🐦‍⬛;Ganimedes, o Copeiro|🏺;Tempestade Viva|🌩️;Oráculo Celeste|🔮;Arquimago do Céu|🧙;Dragão da Tempestade|🐉;Avatar do Trovão|⚡;Aquário, o Portador Celeste|🏺""",
 [('Raio Celeste','⚡',3,'dmg',3),('Bênção das Águas','✨',2,'buff',(2,2)),('Inspiração','💡',2,'draw',2),('Vendaval','🌪️',3,'lane',2),('Tempestade','⛈️',5,'lane',3)]),
'peixes':('Água','ilusao',['vampirico','veneno'],"""Peixe Sonhador|🐟;Medusa Pálida|🪼;Peixinho Listrado|🐠;Bolha Mágica|🫧;Sereia Cantora|🧜‍♀️;Golfinho Místico|🐬;Baiacu|🐡;Pescador de Sonhos|🎣;Espírito da Névoa|🌫️;Oráculo das Marés|🔮;Tritão Místico|🧜;Raia Fantasma|🐟;Sonâmbulo|😴;Coral Vivo|🪸;Baleia Lunar|🐳;Sereia Feiticeira|🧜‍♀️;Peixe Dourado|🐠;Polvo Ilusionista|🐙;Leviatã Jovem|🐋;Sacerdote dos Sonhos|💤;Guardião do Abismo|🌊;Leviatã dos Sonhos|🐋;Dragão Marinho|🐉;Rainha do Oceano|👑;Peixes, os Gêmeos do Mar|🐟""",
 [('Névoa','🌫️',1,'shield',0),('Maré Curativa','💧',1,'heal',4),('Afogar','🌊',2,'dmg',3),('Sonho Profundo','💤',2,'draw',2),('Redemoinho','🌀',3,'lane',2)]),
}
# Habilidade exclusiva de cada signo que dividia a principal com outro (entra em 7 das 14 criaturas principais).
NOVA={'aries':'arremetida','touro':'inabalavel','libra':'julgamento','escorpiao':'ferrao','sagitario':'mira'}
ELON={'Fogo':'face1','Terra':'heal2','Ar':'draw','Água':'volley'}
RATIO={'Fogo':0.56,'Terra':0.36,'Ar':0.46,'Água':0.45}
# "Preço" de cada habilidade no orçamento da criatura (quanto mais forte a habilidade, menos ataque/vida sobra).
# Valores ajustados com o simulador (npm run sim) para cada signo vencer entre 45% e 55%.
KWC={'investida':2.53,'furia':-0.68,'carapaca':1.63,'lideranca':-1.28,'cura':-0.35,'reflexo':2.55,'veneno':0.53,
     'distancia':-0.6,'ascensao':1.5,'corrente':1.5,'ilusao':2.54,
     'arremetida':-0.59,'inabalavel':-0.03,'julgamento':1.73,'ferrao':2.58,'mira':0.37}  # as demais (escudo, perfurar, vampírico) custam 1
# Preço dos efeitos de chegada (⭐).
ONC={'twin':4.79}  # os demais custam 1
import os
if os.environ.get('GEN_PARAMS'):  # usado pelo ajuste automático
    _p=json.loads(os.environ['GEN_PARAMS']); KWC=_p.get('kwc',KWC); ONC=_p.get('onc',ONC); RATIO.update(_p.get('ratio',{}))
P_IDX={0,2,4,6,7,9,11,13,15,17,19,21,23,24}; S0={1,8,14,20,24}; S1={5,12,18,23}; ON_IDX={3,10,16,22,19}
def rar(c): return 'c' if c<=2 else 'r' if c<=4 else 'e' if c<=6 else 'l'
out={}
for sg,(el,P,S,names,spells) in SIGNS.items():
    nm=[x.split('|') for x in names.split(';')]
    assert len(nm)==25,(sg,len(nm))
    for i,(n,e) in enumerate(nm):
        c=COSTS[i]; kw=[]; on=None
        if i in P_IDX:
            if P=='twin': on='twin'
            elif sg in NOVA and sorted(P_IDX).index(i)%2==1: kw.append(NOVA[sg])  # metade fica com a habilidade exclusiva
            else: kw.append(P)
        if i in S0: kw.append(S[0])
        if i in S1: kw.append(S[1])
        if i in ON_IDX and on is None: on=ELON[el]
        kw=list(dict.fromkeys(kw))
        b=2*c+1 + (2 if i>=23 else 0) - sum(KWC.get(k,1) for k in kw) - (ONC.get(on,1) if on else 0)
        b=max(2,b)
        var=[0,0.6,-0.6][i%3]
        a=max(1,round(b*RATIO[el]+var)); h=max(1,round(b-a))
        out[f'{sg}{i+1:02d}']=dict(name=n,race=sg,type='unit',cost=c,atk=a,hp=h,kw=kw,e=e,on=on,r=rar(c) if i<23 else 'l')
    for j,(n,e,c,sp,v) in enumerate(spells):
        d=dict(name=n,race=sg,type='spell',cost=c,sp=sp,e=e,r=rar(c),kw=[])
        if sp=='buff': d['a'],d['h']=v
        else: d['v']=v
        out[f'{sg}s{j+1}']=d
out['eco']=dict(name='Eco',race='gemeos',type='unit',cost=0,atk=1,hp=1,kw=[],e='👥',on=None,r='c')
json.dump(out,open('cartas.json','w'),ensure_ascii=False,indent=1)
print(len(out))
import collections
for sg in SIGNS: print(sg, [ (out[f'{sg}{i:02d}']['atk'],out[f'{sg}{i:02d}']['hp']) for i in (1,5,10,15,19,22,24,25)])
