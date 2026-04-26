# Tekstimallit: interaktiiviset kentät

Tämä dokumentti kuvaa nykyisen tuetun syntaksin tekstimallien dynaamisille kentille.

## Tavallinen tekstikenttä

```txt
Potilas kertoo: {{oire}}
```

Käyttöliittymässä tästä muodostuu vapaa tekstikenttä nimellä `oire`.

## Valintakenttä

```txt
Yleistila on {{yleistila:select:hyvä,kohtalainen,heikko}}.
```

Käyttöliittymässä tästä muodostuu valintapainikkeet:

- hyvä
- kohtalainen
- heikko

## Ehdollinen kenttä

Ehdollinen kenttä näkyy vain, kun toinen kenttä saa tietyn arvon.

```txt
Kipu: {{kipu:select:ei,kyllä}}.
{{kipukuvaus:input:showIf:kipu=kyllä}}
```

Tässä `kipukuvaus` näkyy vain, jos `kipu`-kentässä valitaan `kyllä`.

## Ehdollinen valintakenttä

```txt
Infektioepäily: {{infektio:select:ei,kyllä}}.
{{infektion_lähde:select:virtsatie,keuhko,iho,muu:showIf:infektio=kyllä}}
```

Tässä `infektion_lähde` näkyy vain, jos `infektio` on `kyllä`.

## Suositeltu nimeäminen

Kenttien tunnisteissa kannattaa käyttää lyhyitä ja yksiselitteisiä nimiä:

```txt
{{tajunta:select:virkeä,väsynyt,sekava}}
{{sekavuuden_kuvaus:input:showIf:tajunta=sekava}}
```

Vältä ääkkösiä ja välilyöntejä kenttien teknisissä tunnisteissa. Näytettävä nimi muodostuu tällä hetkellä samasta tunnisteesta.

## Huomioita

- Ehtojen vertailu ei huomioi kirjainkokoa.
- Kentän arvo piilotetaan lopullisesta tekstistä, jos sen `showIf`-ehto ei täyty.
- Jos näkyvälle kentälle ei anneta arvoa, lopulliseen tekstiin jää muistutus muodossa `[kentän_nimi]`.
