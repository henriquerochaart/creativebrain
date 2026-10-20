import absinto from "../../public/imagens/absinto.jpg";
import caprichos from "../../public/imagens/caprichos-morcegos.jpg";
import catedral from "../../public/imagens/catedral.jpg";
import caveira from "../../public/imagens/caveira.jpg";
import corvo from "../../public/imagens/corvo.jpg";
import gargula from "../../public/imagens/gargula.jpg";
import morcego from "../../public/imagens/morcego.jpg";
import nosferatu from "../../public/imagens/nosferatu.jpg";
import olhar from "../../public/imagens/olhar.jpg";
import olho from "../../public/imagens/olho.jpg";
import vela from "../../public/imagens/vela.jpg";

/**
 * Public-domain works, turned into the poster's red halftone. Rights checked against each
 * source's own record: Art Institute of Chicago and The Met (is_public_domain / isPublicDomain,
 * released CC0) and Wikimedia Commons (PD-old-auto-expired). Replace only with art whose license is
 * verified the same way.
 */
export const images = {
  caveira: { src: caveira, alt: "Caveira sobre livros, em retícula vermelha", credit: "Pieter Claesz, Natureza-morta com caveira e pena, 1628 (The Met)" },
  caprichos: { src: caprichos, alt: "Homem adormecido cercado de morcegos e corujas", credit: "Francisco de Goya, O sono da razão produz monstros, 1797–99 (Art Institute of Chicago)" },
  olhar: { src: olhar, alt: "Olhos de uma mulher em close", credit: "Julia Margaret Cameron, Julia Jackson, 1867 (Art Institute of Chicago)" },
  olho: { src: olho, alt: "Um olho enorme cercado de cílios", credit: "Odilon Redon, Por toda parte pupilas flamejam, 1888 (Art Institute of Chicago)" },
  morcego: { src: morcego, alt: "Morcego de asas abertas", credit: "Bhawani Das, Grande morcego-frugívoro indiano, c. 1777–82 (The Met)" },
  vela: { src: vela, alt: "Mulher diante de um espelho com velas acesas", credit: "Georges de La Tour, Madalena penitente, c. 1640 (The Met)" },
  gargula: { src: gargula, alt: "Gárgula de Notre-Dame olhando a cidade", credit: "Charles Meryon, O Vampiro, 1853 (Art Institute of Chicago)" },
  catedral: { src: catedral, alt: "Arcos góticos de uma catedral", credit: "Frederick H. Evans, Catedral de Ely, c. 1891 (Art Institute of Chicago)" },
  nosferatu: { src: nosferatu, alt: "Conde Orlok, o vampiro de Nosferatu", credit: "Nosferatu, F. W. Murnau, 1922 (Wikimedia Commons)" },
  absinto: { src: absinto, alt: "Mulher encostada numa parede ao lado de uma placa de baile", credit: "Félicien Rops, A bebedora de absinto (Art Institute of Chicago)" },
  corvo: { src: corvo, alt: "Cabeça de um corvo de perfil", credit: "Édouard Manet, O Corvo, 1875 (Art Institute of Chicago)" },
};

export type ImageKey = keyof typeof images;
